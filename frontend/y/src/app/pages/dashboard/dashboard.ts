import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import './dashboard.css';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {

  private authService = inject(AuthService);
  usuario = this.authService.usuario;  // Signal del usuario autenticado
  perfilData = signal<any>(null);

  ngOnInit(): void {}

  cargarPerfil(): void {
    this.authService.obtenerPerfil().subscribe({
      next: (res) => this.perfilData.set(res.user),
      error: (err) => console.error('Error al cargar perfil:', err)
    });
  }

  logout(): void {
    this.authService.logout();
  }
}