import { Component, inject, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS],
})
export class LoginComponent implements AfterViewInit {
  email: string = '';
  password: string = '';
  loading: boolean = false;
  showPassword = false;

  /** Accesos rápidos del demo (solo datos sintéticos). */
  private readonly demoAccounts: Record<string, { email: string; password: string }> = {
    admin: { email: 'admin@demo.example', password: 'Demo1234!' },
    seller: { email: 'clerk@demo.example', password: 'Demo1234!' },
    warehouse: { email: 'bodega@demo.example', password: 'Demo1234!' },
  };

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  ngAfterViewInit() {
    setTimeout(() => {
      document.getElementById('input-email')?.focus();
    }, 400);
  }

  demoLogin(role: 'admin' | 'seller' | 'warehouse'): void {
    const account = this.demoAccounts[role];
    if (!account) return;
    this.email = account.email;
    this.password = account.password;
    this.login();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  login(): void {
    if (!this.email || !this.password) {
      this.snackBar.open('Debe ingresar email y contraseña', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
      return;
    }

    this.loading = true;
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        // The root route resolves the role home via homeRedirectGuard.
        this.router.navigate(['/']);
      },
      error: () => {
        this.loading = false;
        this.password = '';
        this.snackBar.open('Credenciales inválidas', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
        });
        document.getElementById('input-email')?.focus();
      },
    });
  }
}
