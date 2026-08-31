import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let authService: AuthService;
  let router: Router;

  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = {} as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([])],
      providers: [AuthService],
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

  it('should redirect to /login and return false when no token exists', () => {
    localStorage.removeItem('access_token');
    const navigateSpy = spyOn(router, 'navigate');

    const result = TestBed.runInInjectionContext(
      () => authGuard(dummyRoute, dummyState)
    );

    expect(result).toBeFalse();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
