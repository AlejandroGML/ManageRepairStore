import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import {
  provideHttpClient,
} from '@angular/common/http';
import {
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AppComponent } from './app.component';
import { AuthService } from './services/auth.service';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, RouterTestingModule.withRoutes([])],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    localStorage.clear();
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should have title manage-repair-store', () => {
    expect(component.title).toEqual('manage-repair-store');
  });

  it('should set userLogged based on AuthService currentUser$ on init', () => {
    const mockUser = { id: 1, name: 'Admin', email: 'admin@demo.example', role: 'admin' };
    localStorage.setItem('current_user', JSON.stringify(mockUser));
    localStorage.setItem('access_token', 'token');

    // Re-create component to pick up localStorage
    fixture.destroy();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AppComponent, RouterTestingModule.withRoutes([])],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
      ],
    });
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.userLogged).toBeDefined();
    expect(component.userLogged?.email).toBe('admin@demo.example');
  });

  it('should have userLogged undefined when not authenticated', () => {
    expect(component.userLogged).toBeUndefined();
  });
});
