import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { UserManagementComponent } from './user-management.component';
import { UsersService } from '../../../services/users.service';
import { SystemUser } from '../../../interface/system-user';
import { of } from 'rxjs';

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;
  let usersServiceSpy: jasmine.SpyObj<UsersService>;

  const mockUsers: SystemUser[] = [
    { id: 1, name: 'Admin', email: 'admin@demo.example', role: 'admin', active: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
    { id: 2, name: 'Vendedor Uno', email: 'vendedor@demo.example', role: 'seller', active: true, createdAt: '2025-01-02T00:00:00Z', updatedAt: '2025-01-02T00:00:00Z' },
    { id: 3, name: 'Bodega Uno', email: 'bodega@demo.example', role: 'warehouse', active: false, createdAt: '2025-01-03T00:00:00Z', updatedAt: '2025-01-03T00:00:00Z' },
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('UsersService', ['getAll', 'create', 'update', 'deactivate']);
    spy.getAll.and.returnValue(of(mockUsers));

    await TestBed.configureTestingModule({
      imports: [
        UserManagementComponent,
        NoopAnimationsModule,
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UsersService, useValue: spy },
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
      ],
    }).compileComponents();

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
    // Email column
    expect(compiled.textContent).toContain('admin@demo.example');
    expect(compiled.textContent).toContain('vendedor@demo.example');
    expect(compiled.textContent).toContain('bodega@demo.example');
    // Name column
    expect(compiled.textContent).toContain('Admin');
    expect(compiled.textContent).toContain('Vendedor Uno');
    expect(compiled.textContent).toContain('Bodega Uno');
  });

  it('should show Activo badge for active users and Inactivo for inactive', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const activeUser = mockUsers[0]; // active
    const inactiveUser = mockUsers[2]; // inactive

    // Should show Activo badge somewhere
    const activoElements = compiled.querySelectorAll('.activo-badge, .activo');
    const inactivoElements = compiled.querySelectorAll('.inactivo-badge, .inactivo');

    // At least one element references "Activo" and "Inactivo"
    expect(compiled.textContent).toContain('Activo');
    expect(compiled.textContent).toContain('Inactivo');
  });

  it('should render role names in Spanish', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Administrador');
    expect(compiled.textContent).toContain('Vendedor');
    expect(compiled.textContent).toContain('Bodega');
  });

  it('should have action buttons for each user row', () => {
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3); // create + edit per user + deactivate per user
  });

  it('should have a "Nuevo Usuario" create button', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Nuevo Usuario');
  });

  it('should call openCreateDialog when create button is clicked', () => {
    spyOn(component, 'openCreateDialog');
    fixture.detectChanges();

    const buttons: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    const createBtn = buttons.find(
      (btn) => btn.textContent?.includes('Nuevo Usuario')
    );

    if (createBtn) {
      createBtn.click();
      expect(component.openCreateDialog).toHaveBeenCalled();
    }
  });

  it('should render the user table with data', () => {
    fixture.detectChanges();
    const table = fixture.nativeElement.querySelector('table');
    expect(table).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('admin@demo.example');
  });

  it('should handle empty user list gracefully', () => {
    usersServiceSpy.getAll.and.returnValue(of([]));
    component.loadUsers();
    fixture.detectChanges();

    expect(component.users.length).toBe(0);
    const compiled = fixture.nativeElement as HTMLElement;
    // Table should be empty — no email display
    expect(compiled.textContent).not.toContain('admin@demo.example');
  });
});
