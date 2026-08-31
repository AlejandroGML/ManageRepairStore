import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  provideHttpClient,
} from '@angular/common/http';
import {
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../../services/auth.service';
import { UserProfile } from '../../../interface/user-profile';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let authService: AuthService;

  const adminUser: UserProfile = {
    id: 1,
    name: 'Admin',
    email: 'admin@demo.example',
    role: 'admin',
  };

  const sellerUser: UserProfile = {
    id: 2,
    name: 'Seller',
    email: 'seller@demo.example',
    role: 'seller',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        { provide: MatDialog, useValue: { open: jasmine.createSpy('open') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    localStorage.clear();
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call AuthService.logout on logout()', () => {
    const logoutSpy = spyOn(authService, 'logout');
    component.logout();
    expect(logoutSpy).toHaveBeenCalled();
  });

  it('should show admin link when userLogged role is admin', () => {
    component.userLogged = adminUser;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Administración');
  });

  it('should NOT show admin link when userLogged role is seller', () => {
    component.userLogged = sellerUser;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Administración');
  });

  it('should show user email when userLogged is set', () => {
    component.userLogged = adminUser;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('admin@demo.example');
  });

  // === Responsive layout tests ===

  it('should render logo image without inline width style (CSS-driven sizing)', () => {
    component.userLogged = adminUser;
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.hasAttribute('style')).withContext('Logo width should be CSS-driven, not inline').toBeFalse();
    expect(img.src).toContain('logo-300x80.png');
  });

  it('should use flexbox container instead of Bootstrap row/col grid', () => {
    component.userLogged = adminUser;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // No Bootstrap grid classes
    expect(compiled.innerHTML).not.toContain('class="row"');
    expect(compiled.innerHTML).not.toContain('col-4');
    expect(compiled.innerHTML).not.toContain('col-8');
    // Has action elements
    expect(compiled.textContent).toContain('admin@demo.example');
    expect(compiled.textContent).toContain('Administración');
    expect(compiled.textContent).toContain('Cerrar sesión');
  });
});
