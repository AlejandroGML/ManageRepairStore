import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { UserManagementComponent } from './user-management.component';
import { UsersService } from '../../../services/users.service';
import { SnackbarService } from '../../../services/snackbar.service';
import { SystemUser } from '../../../interface/system-user';

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;
  let usersServiceSpy: jasmine.SpyObj<UsersService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;

  const mockUsers: SystemUser[] = [
    { id: 1, name: 'Ana Pérez', email: 'test@demo.example', role: 'admin', active: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
    { id: 2, name: 'Vendedor Uno', email: 'test@demo.example', role: 'seller', active: true, createdAt: '2025-01-02T00:00:00Z', updatedAt: '2025-01-02T00:00:00Z' },
    { id: 3, name: 'Bodega Uno', email: 'test@demo.example', role: 'warehouse', active: false, createdAt: '2025-01-03T00:00:00Z', updatedAt: '2025-01-03T00:00:00Z' },
  ];

  beforeEach(async () => {
    usersServiceSpy = jasmine.createSpyObj('UsersService', ['getAll', 'create', 'update', 'deactivate', 'activate']);
    usersServiceSpy.getAll.and.returnValue(of(mockUsers));
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['openSnackBar', 'success', 'error']);

    await TestBed.configureTestingModule({
      imports: [
        UserManagementComponent,
        NoopAnimationsModule,
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UsersService, useValue: usersServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
      ],
    }).compileComponents();

    // MatDialogModule provides MatDialog at module level (Material 21),
    // shadowing the root TestBed provider — override at component level.
    TestBed.overrideComponent(UserManagementComponent, {
      set: { providers: [{ provide: MatDialog, useValue: dialogSpy }] },
    });

    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
    usersServiceSpy = TestBed.inject(UsersService) as jasmine.SpyObj<UsersService>;
    localStorage.clear();
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load users on init and display them in the table', () => {
    expect(usersServiceSpy.getAll).toHaveBeenCalled();
    expect(component.users.length).toBe(3);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('test@demo.example');
    expect(compiled.textContent).toContain('Ana Pérez');
  });

  it('should show avatar with the first letter of the name (Ana Pérez → A)', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const avatars = Array.from(compiled.querySelectorAll('.user-avatar-sm'));
    expect(avatars.length).toBe(3);
    expect(avatars[0].textContent?.trim()).toBe('A');
    expect(component.userInitials('Ana Pérez')).toBe('A');
    expect(component.userInitials('vendedor')).toBe('V');
  });

  it('should display roles in readable Spanish', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Administrador');
    expect(compiled.textContent).toContain('Vendedor');
    expect(compiled.textContent).toContain('Bodega');
  });

  it('should show Desactivado badge for inactive users and Activo for active', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Activo');
    expect(compiled.textContent).toContain('Desactivado');
    // Etiqueta junto al nombre del usuario desactivado
    const inactiveTag = compiled.querySelector('.badge-inactive');
    expect(inactiveTag?.textContent).toContain('Desactivado');
  });

  it('should have a "Nuevo usuario" create button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Nuevo usuario');
  });

  it('should open create dialog when clicking Nuevo usuario', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);
    component.openCreateDialog();
    expect(dialogSpy.open).toHaveBeenCalled();
  });

  it('should open edit and delete dialogs for a user', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);
    component.openEditDialog(mockUsers[0]);
    expect(dialogSpy.open).toHaveBeenCalled();
    component.openDeleteDialog(mockUsers[0]);
    expect(dialogSpy.open).toHaveBeenCalled();
  });

  it('should activate a deactivated user and refresh the list', () => {
    usersServiceSpy.activate.and.returnValue(of({ ...mockUsers[2], active: true }));

    component.activateUser(mockUsers[2]);

    expect(usersServiceSpy.activate).toHaveBeenCalledWith(3);
    expect(usersServiceSpy.getAll).toHaveBeenCalled();
    expect(snackbarSpy.openSnackBar).toHaveBeenCalledWith('Usuario activado exitosamente');
  });

  it('should handle empty user list gracefully', () => {
    usersServiceSpy.getAll.and.returnValue(of([]));
    component.loadUsers();
    fixture.detectChanges();

    expect(component.users.length).toBe(0);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Sin usuarios registrados');
    expect(compiled.textContent).not.toContain('test@demo.example');
  });
});
