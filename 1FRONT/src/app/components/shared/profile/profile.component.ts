import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthApiService } from '../../../services/auth.api.service';
import { AuthService } from '../../../services/auth.service';
import { SnackbarService } from '../../../services/snackbar.service';
import { UserProfile } from '../../../interface/user-profile';

/**
 * Small self-service view: shows the authenticated user's identity and
 * allows changing their own password. Available to every role.
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly authService = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);

  user: UserProfile | undefined = this.authService.getCurrentUser() ?? undefined;

  saving = false;
  hideCurrent = true;
  hideNew = true;

  form = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordsMatch },
  );

  get roleLabel(): string {
    switch (this.user?.role) {
      case 'admin':
        return 'Administrador';
      case 'warehouse':
        return 'Bodega';
      case 'seller':
        return 'Vendedor';
      default:
        return '';
    }
  }

  get initials(): string {
    const name = this.user?.name ?? '';
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.charAt(0) ?? '').toUpperCase();
  }

  get passwordsMismatch(): boolean {
    const { newPassword, confirmPassword } = this.form.getRawValue();
    return (
      newPassword.length > 0 &&
      confirmPassword.length > 0 &&
      newPassword !== confirmPassword
    );
  }

  submit(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.saving = true;
    this.authApi.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.saving = false;
        this.form.reset();
        this.snackbar.success('Contraseña actualizada correctamente');
      },
      error: (err: any) => {
        this.saving = false;
        this.snackbar.error(
          err.error?.message || 'No se pudo actualizar la contraseña',
        );
      },
    });
  }

  private passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const newPassword = String(group.get('newPassword')?.value ?? '');
    const confirmPassword = String(group.get('confirmPassword')?.value ?? '');
    return newPassword === confirmPassword ? null : { passwordsMismatch: true };
  }
}
