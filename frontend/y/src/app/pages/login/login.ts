import { Component, inject, signal } from '@angular/core';
import { FormBuilder,
         Validators,
         ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink,
         ActivatedRoute }      from '@angular/router';
import { AuthService }         from '../../core/services/auth.service';
import { CommonModule }        from '@angular/common';
import './login.css';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})

export class LoginComponent {

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  cargando = signal(false);
  errorMsg = signal('');

  onSubmit(): void {
    if (this.form.invalid) return;
    this.cargando.set(true);
    this.errorMsg.set('');

    const { email, password } = this.form.value;

    this.authService.login(email!, password!).subscribe({
      next: () => {
        // Ir a la URL de retorno si existe, sino al dashboard:
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.cargando.set(false);
        this.errorMsg.set(err.error?.error || 'Error al iniciar sesion. Verifica tus datos.');
      },
      complete: () => this.cargando.set(false)
    });
  }
}