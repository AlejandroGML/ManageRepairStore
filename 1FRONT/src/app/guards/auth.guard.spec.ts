import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  Routes,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';
import { homeRedirectGuard } from './home-redirect.guard';

@Component({ template: '', standalone: true })
class DummyComponent {}

const dummyRoute = {} as ActivatedRouteSnapshot;
const dummyState = {} as RouterStateSnapshot;

describe('authGuard', () => {
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: DummyComponent },
          { path: '', component: DummyComponent },
        ]),
        AuthService,
      ],
    });
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should return true when user is logged in', () => {
    localStorage.setItem('access_token', 'valid-token');
    const result = TestBed.runInInjectionContext(
      () => authGuard(dummyRoute, dummyState)
    );
    expect(result).toBeTrue();
  });

  it('should return an UrlTree to /login when no token exists', () => {
    localStorage.removeItem('access_token');
    const result = TestBed.runInInjectionContext(
      () => authGuard(dummyRoute, dummyState)
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });
});

describe('authGuard router integration (no shell for unauthenticated users)', () => {
  const testRoutes: Routes = [
    { path: 'login', component: DummyComponent },
    {
      path: '',
      component: DummyComponent,
      canActivate: [authGuard],
      children: [
        {
          path: '',
          pathMatch: 'full',
          canActivate: [homeRedirectGuard],
          component: DummyComponent,
        },
        { path: 'productos', component: DummyComponent },
      ],
    },
  ];

  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter(testRoutes), AuthService],
    }).compileComponents();
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should redirect unauthenticated access to /productos to /login', async () => {
    await router.navigate(['/productos']);
    expect(router.url).toBe('/login');
  });

  it('should let an authenticated user reach /productos', async () => {
    localStorage.setItem('access_token', 'test-token');
    await router.navigate(['/productos']);
    expect(router.url).toBe('/productos');
  });
});
