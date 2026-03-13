import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, switchMap } from 'rxjs';
import { TokenService } from './token.service';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}

export interface AuthResponse {
  accessToken: string;
  user: Usuario;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly API = 'http://localhost:3000/api/auth';

  // Signal: estado reactivo del usuario. null = no autenticado.
  // Usando signals de Angular 18 (la forma moderna y mas eficiente)
  private _usuario = signal<Usuario | null>(null);

  // Computed: derivado del signal, se actualiza automaticamente
  readonly usuario   = this._usuario.asReadonly();
  readonly estaAutenticado = computed(() => this._usuario() !== null);
  readonly esAdmin   = computed(() => this._usuario()?.rol === 'admin');

  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
    private router: Router
  ) {
    // Al iniciar la app, intentar recuperar la sesion via refresh token:
    this.intentarRecuperarSesion();
  }

  // ── METODOS PUBLICOS ────────────────────────────────────────────────

  registro(email: string, password: string, nombre: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/registro`, { email, password, nombre })
      .pipe(tap(res => this.procesarRespuestaAuth(res)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/login`, { email, password }, {
      withCredentials: true  // CRITICO: permite enviar/recibir cookies
    }).pipe(tap(res => this.procesarRespuestaAuth(res)));
  }

  logout(): void {
    this.http.post(`${this.API}/logout`, {}, { withCredentials: true })
      .subscribe({
        next: () => this.limpiarSesion(),
        error: () => this.limpiarSesion() // Limpiar local aunque el server falle
      });
  }

  /** Obtiene un nuevo access token usando el refresh token (en cookie) */
  refreshAccessToken(): Observable<{ accessToken: string }> {
    return this.http.post<{ accessToken: string }>(`${this.API}/refresh`, {}, {
      withCredentials: true
    }).pipe(
      tap(res => this.tokenService.setAccessToken(res.accessToken)),
      catchError(err => {
        this.limpiarSesion();
        return throwError(() => err);
      })
    );
  }

  obtenerPerfil(): Observable<{ user: Usuario }> {
    return this.http.get<{ user: Usuario }>(`${this.API}/perfil`);
    // El interceptor agrega automaticamente el Authorization header
  }

  // ── METODOS PRIVADOS ────────────────────────────────────────────────

  private procesarRespuestaAuth(res: AuthResponse): void {
    this.tokenService.setAccessToken(res.accessToken);
    this._usuario.set(res.user);
  }

  private limpiarSesion(): void {
    this.tokenService.clearAccessToken();
    this._usuario.set(null);
    this.router.navigate(['/login']);
  }

  /** Al recargar la pagina, el access token en memoria se pierde.
   * Este metodo intenta renovarlo usando el refresh token (en cookie). */
  private intentarRecuperarSesion(): void {
    this.http.post<{ accessToken: string }>(`${this.API}/refresh`, {}, {
      withCredentials: true
    }).pipe(
      switchMap(res => {
        this.tokenService.setAccessToken(res.accessToken);
        return this.http.get<{ user: Usuario }>(`${this.API}/perfil`);
      })
    ).subscribe({
      next: (res) => this._usuario.set(res.user),
      error: () => { /* Sin sesion activa, no hacer nada */ }
    });
  }
}