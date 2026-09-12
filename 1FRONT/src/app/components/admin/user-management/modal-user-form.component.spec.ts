import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ModalUserFormComponent } from './modal-user-form.component';
import { UsersService } from '../../../services/users.service';
import { SystemUser } from '../../../interface/system-user';
import { of, throwError } from 'rxjs';

describe('ModalUserFormComponent', () => {
  let component: ModalUserFormComponent;
  let fixture: ComponentFixture<ModalUserFormComponent>;
  let usersServiceSpy: jasmine.SpyObj<UsersService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ModalUserFormComponent>>;

  const existingUser: SystemUser = {
    id: 2,
    name: 'Vendedor Uno',
    email: 'test@demo.example',
    role: 'seller',
    active: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  function createComponent(data: any): void {
    TestBed.configureTestingModule({
      imports: [ModalUserFormComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: UsersService, useValue: usersServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalUserFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    usersServiceSpy = jasmine.createSpyObj('UsersService', ['create', 'update']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
  });

  // ─── CREATE MODE ─────────────────────────────────────────
  describe('Create mode', () => {
    beforeEach(() => {
      createComponent(null);
    });

    it('should show "Nuevo usuario" title', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Nuevo usuario');
    });

    it('should have password field required in create mode', () => {
      const passwordControl = component.form.get('password');
      // On create mode, empty password = required error
      passwordControl?.markAsTouched();
      passwordControl?.updateValueAndValidity();
      expect(passwordControl?.hasError('required')).toBeTrue();
      expect(component.isEditMode).toBeFalse();
    });

    it('should mark form as invalid when required fields are empty', () => {
      component.form.patchValue({ name: '', email: '', password: '', role: null });
      expect(component.form.valid).toBeFalse();
    });

    it('should call usersService.create when save() is called with valid form', () => {
      const mockUser: SystemUser = {
        id: 4,
        name: 'Nuevo Usuario',
        email: 'test@demo.example',
        role: 'seller',
        active: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };
      usersServiceSpy.create.and.returnValue(of(mockUser));

      component.form.patchValue({
        name: 'Nuevo Usuario',
        email: 'test@demo.example',
        password: 'Password1',
        role: 'seller',
      });

      component.save();

      expect(usersServiceSpy.create).toHaveBeenCalledWith({
        name: 'Nuevo Usuario',
        email: 'test@demo.example',
        password: 'Password1',
        role: 'seller',
      });
      expect(dialogRefSpy.close).toHaveBeenCalledWith(mockUser);
    });

    it('should close with null when creation fails', () => {
      usersServiceSpy.create.and.returnValue(throwError(() => new Error('Error')));

      component.form.patchValue({
        name: 'Nuevo',
        email: 'test@demo.example',
        password: 'Password1',
        role: 'seller',
      });

      component.save();

      expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
    });

    it('should not submit when form is invalid', () => {
      component.form.patchValue({ name: '', email: '', password: '', role: null });
      component.save();
      expect(usersServiceSpy.create).not.toHaveBeenCalled();
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    });

    it('should close dialog when close() is called', () => {
      component.close();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
    });
  });

  // ─── EDIT MODE ───────────────────────────────────────────
  describe('Edit mode', () => {
    beforeEach(() => {
      createComponent({ user: existingUser });
    });

    it('should show "Editar usuario" title', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Editar usuario');
    });

    it('should pre-fill form with existing user data', () => {
      expect(component.form.get('name')?.value).toBe('Vendedor Uno');
      expect(component.form.get('email')?.value).toBe('test@demo.example');
      expect(component.form.get('role')?.value).toBe('seller');
    });

    it('should have password field optional in edit mode', () => {
      expect(component.isEditMode).toBeTrue();
      expect(component.form.get('password')?.hasError('required')).toBeFalse();
    });

    it('should call usersService.update when save() is called', () => {
      const updatedUser: SystemUser = { ...existingUser, name: 'Nombre Editado', updatedAt: '2025-01-02T00:00:00Z' };
      usersServiceSpy.update.and.returnValue(of(updatedUser));

      component.form.patchValue({ name: 'Nombre Editado' });
      component.save();

      expect(usersServiceSpy.update).toHaveBeenCalledWith(2, {
        name: 'Nombre Editado',
        email: 'test@demo.example',
        role: 'seller',
      });
      expect(dialogRefSpy.close).toHaveBeenCalledWith(updatedUser);
    });

    it('should include password in update if provided', () => {
      usersServiceSpy.update.and.returnValue(of(existingUser));

      component.form.patchValue({ password: 'NewPass123!' });
      component.save();

      expect(usersServiceSpy.update).toHaveBeenCalledWith(2, {
        name: 'Vendedor Uno',
        email: 'test@demo.example',
        role: 'seller',
        password: 'NewPass123!',
      });
    });

    it('should close with null on update error', () => {
      usersServiceSpy.update.and.returnValue(throwError(() => new Error('Error')));

      component.save();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
    });
  });
});
