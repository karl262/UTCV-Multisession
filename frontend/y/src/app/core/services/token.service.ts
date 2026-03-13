import { Injectable } from '@angular/core';

/**
 * TokenService: responsable UNICAMENTE de guardar y recuperar
 * el access token del almacenamiento del navegador.
 *
 * DECISION DE DISEÑO: guardamos el access token en memoria (variable)
 * en lugar de localStorage. Esto es mas seguro porque los ataques XSS
 * no pueden robar un token que no esta en el DOM.
 *
 * Desventaja: al recargar la pagina, el token se pierde.
 * Solucion: usamos el refresh token (en HttpOnly Cookie) para
 * recuperar un nuevo access token automaticamente.
 */
@Injectable({
  providedIn: 'root'
})
export class TokenService {

  // El access token vive solo en memoria durante la sesion del navegador.
  private accessToken: string | null = null;

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  clearAccessToken(): void {
    this.accessToken = null;
  }

  hasAccessToken(): boolean {
    return this.accessToken !== null;
  }

  /**
   * Decodifica el payload del JWT sin verificar la firma.
   * Util para leer el tiempo de expiracion o datos del usuario
   * en el frontend SIN hacer una peticion al servidor.
   */
  decodePayload(): any | null {
    if (!this.accessToken) return null;
    try {
      const parts = this.accessToken.split('.');
      if (parts.length !== 3) return null;
      // atob() decodifica Base64. El payload es la segunda parte.
      const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }

  isTokenExpired(): boolean {
    const payload = this.decodePayload();
    if (!payload || !payload.exp) return true;
    // exp esta en segundos Unix, Date.now() en milisegundos:
    return Date.now() >= payload.exp * 1000;
  }
}