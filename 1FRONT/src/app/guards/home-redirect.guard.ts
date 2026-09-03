import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Redirects authenticated users to their role's home screen.
 * Used on the shell's '' child route and on /login so a logged-in
 * user never stays on the generic root or the login screen.
 *
 * Unauthenticated users are ALLOWED through (returns true): on /login
 * they must reach the form, and on the shell's '' child they are
 * unreachable anyway because authGuard on the parent redirects first.
 * Returning parseUrl('/login') here was an infinite redirect loop on
 * the /login route (guard → /login → guard → /login …), which hung the
 * renderer and left the app on a blank screen. (ABAGAS lesson, fixed
 * in 3a4e3db; ported here.)
 */
export const homeRedirectGuard: CanActivateFn = (): boolean | UrlTree => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const user = authService.getCurrentUser();
  switch (user?.role) {
    case 'admin':
      return router.parseUrl('/panel');
    case 'warehouse':
      return router.parseUrl('/bodega');
    case 'seller':
      return router.parseUrl('/ventas');
    default:
      return true;
  }
};
