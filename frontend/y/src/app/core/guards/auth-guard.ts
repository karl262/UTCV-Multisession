import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Guard funcional de Angular 18.
 * Protege rutas que requieren autenticacion.
 * Uso en app.routes.ts: canActivate: [authGuard]
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  if (authService.estaAutenticado()) {
    return true; // Deja pasar
  }

  // Guardar la URL a la que intentaba ir para redirigir despues del login:
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false; // Bloquear el acceso
};

/** Guard para rutas que NO deben ser accesibles cuando YA esta autenticado
 * (ej: la pagina de login o registro) */
export const noAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  if (!authService.estaAutenticado()) {
    return true;
  }

  // Ya esta autenticado, redirigir al dashboard:
  router.navigate(['/dashboard']);
  return false;
};