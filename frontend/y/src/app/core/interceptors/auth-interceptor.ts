import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor funcional de Angular 18 (la forma moderna sin clases).
 * Se ejecuta en cada peticion HTTP que salga de la aplicacion.
 *
 * Hace dos cosas:
 * 1. Agrega el Access Token al header Authorization (si existe)
 * 2. Si recibe error 401 (token expirado), intenta renovarlo automaticamente
 * y reintenta la peticion original.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const tokenService = inject(TokenService);
  const authService  = inject(AuthService);

  // Clonar la peticion y agregar el token (si existe):
  const token = tokenService.getAccessToken();
  const reqConToken = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(reqConToken).pipe(
    catchError((error: HttpErrorResponse) => {

      // Si el error es 401 y tiene el codigo TOKEN_EXPIRED,
      // intentamos renovar el token y reintentar:
      if (error.status === 401 && error.error?.code === 'TOKEN_EXPIRED') {
        return authService.refreshAccessToken().pipe(
          switchMap(res => {
            // Reintentar la peticion original con el nuevo token:
            const newReq = req.clone({
              setHeaders: { Authorization: `Bearer ${res.accessToken}` }
            });
            return next(newReq);
          })
        );
      }

      return throwError(() => error);
    })
  );
};