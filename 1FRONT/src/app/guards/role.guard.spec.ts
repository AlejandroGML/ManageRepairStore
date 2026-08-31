import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let router: Router;

  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = {} as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([])],
    });
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should return true when user has the required role (admin)', () => {
    localStorage.setItem(
      'current_user',
      JSON.stringify({
        id: 1,
        name: 'Admin',
        email: 'admin@demo.example',
        role: 'admin',
      })
    );

    const guard = roleGuard('admin');
    const result = TestBed.runInInjectionContext(() =>
      guard(dummyRoute, dummyState)
    );
    expect(result).toBeTrue();
  });

  it('should return false and redirect when user lacks the required role', () => {
    localStorage.setItem(
      'current_user',
      JSON.stringify({
        id: 2,
        name: 'Seller',
        email: 'seller@demo.example',
        role: 'seller',
      })
    );

    const navigateSpy = spyOn(router, 'navigate');
    const guard = roleGuard('admin');
    const result = TestBed.runInInjectionContext(() =>
      guard(dummyRoute, dummyState)
    );

    expect(result).toBeFalse();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
