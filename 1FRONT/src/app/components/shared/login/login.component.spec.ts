import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
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

  it('should call AuthService.login on login() and emit user on success', () => {
    const mockUser = {
      id: 1,
      name: 'Admin',
      email: 'admin@demo.example',
      role: 'admin',
    };
    const emitSpy = spyOn(component.setLoggedEvent, 'emit');

    component.email = 'admin@demo.example';
    component.password = 'Admin123!';
    component.login();

    const req = httpMock.expectOne(backendUrl + '/auth/login');
    expect(req.request.body).toEqual({
      email: 'admin@demo.example',
      password: 'Admin123!',
    });
    req.flush({ access_token: 'token', user: mockUser });

    expect(emitSpy).toHaveBeenCalledWith(mockUser);
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

  // === Responsive layout tests ===

  it('should use .login-wrapper class instead of inline percentage width', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const wrapper = compiled.querySelector('.login-wrapper');
    expect(wrapper).withContext('Login should use .login-wrapper CSS class').toBeTruthy();
    // No inline width/margin-left styles
    expect(compiled.innerHTML).not.toContain('style="width:30%');
    expect(compiled.innerHTML).not.toContain('margin-left:35%');
  });

  it('should not have inline background-color on login button', () => {
    component.email = 'admin@demo.example';
    component.password = 'Admin123!';
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button[type="submit"]');
    expect(button).toBeTruthy();
    // Background color should come from CSS var, not inline style
    const hasInlineBg = button!.hasAttribute('style') && button!.getAttribute('style')!.includes('background-color');
    expect(hasInlineBg).withContext('Button bg should come from CSS, not inline style').toBeFalse();
  });
});
