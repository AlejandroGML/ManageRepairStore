import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UserDeleteDialogComponent } from './user-delete-dialog.component';
import { UsersService } from '../../../services/users.service';
import { AuthService } from '../../../services/auth.service';
import { SystemUser } from '../../../interface/system-user';
import { of, throwError } from 'rxjs';

describe('UserDeleteDialogComponent', () => {
  let component: UserDeleteDialogComponent;
  let fixture: ComponentFixture<UserDeleteDialogComponent>;
  let usersServiceSpy: jasmine.SpyObj<UsersService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<UserDeleteDialogComponent>>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const targetUser: SystemUser = {
    id: 3,
    name: 'Bodega Uno',
    email: 'bodega@demo.example',
    role: 'warehouse',
    active: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    usersServiceSpy = jasmine.createSpyObj('UsersService', ['deactivate']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);

    await TestBed.configureTestingModule({
      imports: [UserDeleteDialogComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: targetUser },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: UsersService, useValue: usersServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserDeleteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and show user name in the dialog', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Bodega Uno');
  });

  it('should show title "Desactivar Usuario"', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Desactivar Usuario');
  });

  it('should call usersService.deactivate when deactivate() is called (not self)', () => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 1, name: 'Admin', email: 'admin@demo.example', role: 'admin' });

    usersServiceSpy.deactivate.and.returnValue(of(targetUser));

    component.deactivate();

    expect(usersServiceSpy.deactivate).toHaveBeenCalledWith(3);
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('should show error and NOT deactivate when user tries to deactivate self', () => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 3, name: 'Bodega Uno', email: 'bodega@demo.example', role: 'warehouse' });

    component.deactivate();

    expect(component.errorMessage).toBe('No puedes desactivar tu propia cuenta');
    expect(usersServiceSpy.deactivate).not.toHaveBeenCalled();
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('should render self-deactivation error in the UI', () => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 3, name: 'Bodega Uno', email: 'bodega@demo.example', role: 'warehouse' });

    component.deactivate();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No puedes desactivar tu propia cuenta');
  });

  it('should close with null when deactivation API fails', () => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 1, name: 'Admin', email: 'admin@demo.example', role: 'admin' });
    usersServiceSpy.deactivate.and.returnValue(throwError(() => new Error('Error')));

    component.deactivate();

    expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
  });

  it('should close with null when close() is called', () => {
    component.close();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
  });
});
