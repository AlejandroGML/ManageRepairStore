import { Component, Output, EventEmitter, inject, AfterViewInit } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { UserProfile } from 'src/app/interface/user-profile';
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
  @Output() setLoggedEvent = new EventEmitter<UserProfile>();

  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly demoAccounts: Record<string, { email: string; password: string }> = {
    admin: { email: 'admin@demo.example', password: 'Demo1234!' },
    seller: { email: 'clerk@demo.example', password: 'Demo1234!' },
    warehouse: { email: 'bodega@demo.example', password: 'Demo1234!' },
  };

  ngAfterViewInit() {
    if (this.authService.getToken()) {
      this.router.navigate(['/']);
      return;
    }
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
      next: (response) => {
        this.loading = false;
        this.setLoggedEvent.emit(response.user);
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
