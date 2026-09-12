import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route guard: allows access when the current user's role is in the allowed list.
 * Forbidden users are redirected to the root path ('/'), where homeRedirectGuard
 * resolves their role's home screen (or /login when unauthenticated).
 */
export const rolesGuard = (allowedRoles: string[]): CanActivateFn => {
  return (): boolean | UrlTree => {
    const router = inject(Router);
    const authService = inject(AuthService);
    const user = authService.getCurrentUser();
    if (user && allowedRoles.includes(user.role)) {
      return true;
    }
    return router.parseUrl('/');
  };
};
