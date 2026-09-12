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
import { rolesGuard } from './roles.guard';
import { authGuard } from './auth.guard';
import { homeRedirectGuard } from './home-redirect.guard';

@Component({ template: '', standalone: true })
class DummyComponent {}

const dummyRoute = {} as ActivatedRouteSnapshot;
const dummyState = {} as RouterStateSnapshot;

function setCurrentUser(role: string): void {
  localStorage.setItem(
    'current_user',
    JSON.stringify({ id: 1, name: 'Test', email: 'test@demo.example', role })
  );
}

describe('rolesGuard', () => {
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
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should allow a user whose role is in the allowed list', () => {
    setCurrentUser('admin');
    const guard = rolesGuard(['admin']);
    const result = TestBed.runInInjectionContext(() =>
      guard(dummyRoute, dummyState)
    );
    expect(result).toBeTrue();
  });

  it('should allow a seller when seller is in the allowed list', () => {
    setCurrentUser('seller');
    const guard = rolesGuard(['admin', 'seller']);
    const result = TestBed.runInInjectionContext(() =>
      guard(dummyRoute, dummyState)
    );
    expect(result).toBeTrue();
  });

  it('should block a seller from an admin-only route with an UrlTree to the role home', () => {
    setCurrentUser('seller');
    const guard = rolesGuard(['admin']);
    const result = TestBed.runInInjectionContext(() =>
      guard(dummyRoute, dummyState)
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/');
  });

  it('should block a warehouse user from a sales route with an UrlTree to the role home', () => {
    setCurrentUser('warehouse');
    const guard = rolesGuard(['admin', 'seller']);
    const result = TestBed.runInInjectionContext(() =>
      guard(dummyRoute, dummyState)
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/');
  });

  it('should block an unauthenticated user with an UrlTree to the root', () => {
    localStorage.removeItem('current_user');
    const guard = rolesGuard(['admin']);
    const result = TestBed.runInInjectionContext(() =>
      guard(dummyRoute, dummyState)
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/');
  });
});

describe('rolesGuard + homeRedirectGuard chain (router integration)', () => {
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
        {
          path: 'ventas',
          component: DummyComponent,
          canActivate: [rolesGuard(['admin', 'seller'])],
        },
        {
          path: 'productos',
          component: DummyComponent,
          canActivate: [rolesGuard(['admin', 'warehouse'])],
        },
        {
          path: 'bodega',
          component: DummyComponent,
          canActivate: [rolesGuard(['admin', 'warehouse'])],
        },
        {
          path: 'admin',
          component: DummyComponent,
          canActivate: [rolesGuard(['admin'])],
        },
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
    localStorage.setItem('access_token', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should redirect a seller navigating to /admin to their role home (/ventas)', async () => {
    setCurrentUser('seller');
    await router.navigate(['/admin']);
    expect(router.url).toBe('/ventas');
  });

  it('should block a warehouse user from /ventas and send them to their role home (/bodega)', async () => {
    setCurrentUser('warehouse');
    await router.navigate(['/ventas']);
    expect(router.url).toBe('/bodega');
  });

  it('should let a warehouse user open inventory screens (/productos)', async () => {
    setCurrentUser('warehouse');
    await router.navigate(['/productos']);
    expect(router.url).toBe('/productos');
  });

  it('should let an admin open any screen (/admin)', async () => {
    setCurrentUser('admin');
    await router.navigate(['/admin']);
    expect(router.url).toBe('/admin');
  });
});
