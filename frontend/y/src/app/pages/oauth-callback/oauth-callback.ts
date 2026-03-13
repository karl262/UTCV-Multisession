import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TokenService }  from '../../core/services/token.service';
import { AuthService }   from '../../core/services/auth.service';
import { CommonModule }  from '@angular/common';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="text-align:center; padding:3rem;">
      <p>Completando inicio de sesion con Google...</p>
    </div>
  `
})
export class OAuthCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tokenService: TokenService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParams['token'];

    if (token) {
      // Guardar el token en memoria:
      this.tokenService.setAccessToken(token);

      // Cargar los datos del usuario desde el servidor:
      this.authService.obtenerPerfil().subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: () => this.router.navigate(['/login'], { queryParams: { error: 'oauth_failed' } })
      });
    } else {
      this.router.navigate(['/login']);
    }
  }
}