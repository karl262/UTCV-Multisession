import { Routes } from '@angular/router';
import { authGuard, noAuthGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  // Redireccion por defecto:
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // Rutas publicas (accesibles sin autenticacion):
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login')
      .then(m => m.LoginComponent),
    canActivate: [noAuthGuard]  // Si ya esta auth, redirige al dashboard
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/register/register')
      .then(m => m.Register),
    canActivate: [noAuthGuard]
  },

  // Rutas protegidas (requieren autenticacion):
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard')
      .then(m => m.DashboardComponent),
    canActivate: [authGuard]  // Redirige al login si no esta autenticado
  },
  
  // Ruta OAuth Callback (Agregada para SSO)
  { 
    path: 'oauth-callback', 
    loadComponent: () => import('./pages/oauth-callback/oauth-callback')
      .then(m => m.OAuthCallbackComponent) 
  },

  // Ruta para cualquier URL no reconocida:
  { path: '**', redirectTo: '/login' }
];