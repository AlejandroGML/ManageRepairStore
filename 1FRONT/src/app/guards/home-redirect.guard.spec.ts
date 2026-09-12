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

describe('homeRedirectGuard', () => {
  let router: Router;

  const routes: Routes = [{ path: '', component: DummyComponent }];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), AuthService],
    });
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  const runGuard = () =>
    TestBed.runInInjectionContext(() =>
      homeRedirectGuard(dummyRoute, dummyState)
    );

  it('should redirect an admin to /panel', () => {
    setCurrentUser('admin');
    const result = runGuard();
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/panel');
  });

  it('should redirect a seller to /ventas', () => {
    setCurrentUser('seller');
    const result = runGuard();
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/ventas');
  });

  it('should redirect a warehouse user to /bodega', () => {
    setCurrentUser('warehouse');
    const result = runGuard();
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/bodega');
  });

  it('should allow an unauthenticated user through (no redirect)', () => {
    localStorage.removeItem('current_user');
    const result = runGuard();
    expect(result).toBe(true);
  });
});
