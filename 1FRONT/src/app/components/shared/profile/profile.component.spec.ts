import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { ProfileComponent } from './profile.component';
import { AuthApiService } from '../../../services/auth.api.service';
import { AuthService } from '../../../services/auth.service';
import { SnackbarService } from '../../../services/snackbar.service';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let authApiSpy: jasmine.SpyObj<AuthApiService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;

  const user = { id: 1, name: 'Alejandro M', email: 'a@b.cl', role: 'admin' };

  beforeEach(async () => {
    authApiSpy = jasmine.createSpyObj('AuthApiService', ['changePassword']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['success', 'error', 'openSnackBar']);
    authServiceSpy.getCurrentUser.and.returnValue(user);

    await TestBed.configureTestingModule({
      imports: [ProfileComponent, ReactiveFormsModule, FormsModule, NoopAnimationsModule],
      providers: [
        { provide: AuthApiService, useValue: authApiSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and show the user name and role', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Alejandro M');
    expect(compiled.textContent).toContain('Administrador');
  });

  it('should reject submission when passwords do not match', () => {
    component.form.setValue({
      currentPassword: 'Password2026!',
      newPassword: 'NuevaClave123',
      confirmPassword: 'Distinta123',
    });
    component.submit();
    expect(authApiSpy.changePassword).not.toHaveBeenCalled();
    expect(component.form.invalid).toBeTrue();
  });

  it('should call changePassword on valid submit and reset the form', () => {
    authApiSpy.changePassword.and.returnValue(of({ success: true }));
    component.form.setValue({
      currentPassword: 'Password2026!',
      newPassword: 'NuevaClave123',
      confirmPassword: 'NuevaClave123',
    });
    component.submit();
    expect(authApiSpy.changePassword).toHaveBeenCalledWith('Password2026!', 'NuevaClave123');
    expect(snackbarSpy.success).toHaveBeenCalledWith('Contraseña actualizada correctamente');
  });

  it('should surface the backend error message on failure', () => {
    authApiSpy.changePassword.and.returnValue(
      throwError(() => ({ error: { message: 'La contraseña actual no es correcta' } }))
    );
    component.form.setValue({
      currentPassword: 'mala!',
      newPassword: 'NuevaClave123',
      confirmPassword: 'NuevaClave123',
    });
    component.submit();
    expect(snackbarSpy.error).toHaveBeenCalledWith('La contraseña actual no es correcta');
    expect(component.saving).toBeFalse();
  });
});
