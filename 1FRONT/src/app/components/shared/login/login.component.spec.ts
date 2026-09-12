import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: AuthService;
  let httpMock: HttpTestingController;
  let snackBar: MatSnackBar;

  const backendUrl = 'http://localhost:3000';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        RouterTestingModule.withRoutes([]),
        BrowserAnimationsModule,
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        MatSnackBar,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    snackBar = TestBed.inject(MatSnackBar);
    localStorage.clear();
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call AuthService.login on login() and navigate to / on success', () => {
    const mockUser = {
      id: 1,
      name: 'Admin',
      email: 'admin@demo.example',
      role: 'admin',
    };
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    component.email = 'admin@demo.example';
    component.password = 'Admin123!';
    component.login();

    const req = httpMock.expectOne(backendUrl + '/auth/login');
    expect(req.request.body).toEqual({
      email: 'admin@demo.example',
      password: 'Admin123!',
    });
    req.flush({ access_token: 'token', user: mockUser });

    expect(navigateSpy).toHaveBeenCalledWith(['/']);
  });

  it('should set loading to false after successful login', () => {
    component.email = 'admin@demo.example';
    component.password = 'Admin123!';
    component.login();
    expect(component.loading).toBeTrue();

    const req = httpMock.expectOne(backendUrl + '/auth/login');
    req.flush({
      access_token: 'token',
      user: { id: 1, name: 'Admin', email: 'admin@demo.example', role: 'admin' },
    });

    expect(component.loading).toBeFalse();
  });

  it('should clear password and stop loading on login failure', () => {
    component.email = 'wrong@test.cl';
    component.password = 'wrongpass';
    component.login();
    expect(component.loading).toBeTrue();

    const req = httpMock.expectOne(backendUrl + '/auth/login');
    req.flush(
      { message: 'Credenciales inválidas' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(component.loading).toBeFalse();
    expect(component.password).toBe('');
  });

  it('should start with loading=false', () => {
    expect(component.loading).toBeFalse();
  });

  // === Split-screen layout tests ===

  it('should render the split-screen brand panel with the Manage Repair Store logo', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.login-brand')).toBeTruthy();
    expect(compiled.querySelector('.login-form-pane')).toBeTruthy();
    const logo = compiled.querySelector('.brand-logo') as HTMLImageElement;
    expect(logo).toBeTruthy();
    expect(logo?.getAttribute('alt')).toBe('Manage Repair Store');
  });

  it('should show the demo quick-login box with the three synthetic roles (portfolio)', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('ENTRAR COMO');
    expect(compiled.querySelector('.demo-box')).toBeTruthy();
    expect(compiled.querySelectorAll('.demo-role').length).toBe(3);
    expect(compiled.textContent).toContain('Demo1234!');
  });

  it('should fill credentials and submit when a demo role is clicked', () => {
    const mockUser = { id: 1, name: 'Admin', email: 'admin@demo.example', role: 'admin' };
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    component.demoLogin('admin');

    expect(component.email).toBe('admin@demo.example');
    expect(component.password).toBe('Demo1234!');

    const req = httpMock.expectOne(backendUrl + '/auth/login');
    expect(req.request.body).toEqual({
      email: 'admin@demo.example',
      password: 'Demo1234!',
    });
    req.flush({ access_token: 'token', user: mockUser });

    expect(navigateSpy).toHaveBeenCalledWith(['/']);
  });

  it('should toggle password visibility', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.showPassword).toBeFalse();
    let input = compiled.querySelector('#input-pass') as HTMLInputElement;
    expect(input.type).toBe('password');

    component.togglePassword();
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('#input-pass') as HTMLInputElement;
    expect(component.showPassword).toBeTrue();
    expect(input.type).toBe('text');

    component.togglePassword();
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('#input-pass') as HTMLInputElement;
    expect(input.type).toBe('password');
  });

  it('should show "Iniciar sesión" submit button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Iniciar sesión');
    const button = compiled.querySelector('button[type="submit"]');
    expect(button).toBeTruthy();
  });
});
