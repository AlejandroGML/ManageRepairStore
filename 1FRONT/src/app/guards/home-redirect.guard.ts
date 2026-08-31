import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Redirects the root path to each role's landing screen. */
export const homeRedirectGuard: CanActivateFn = (): UrlTree => {
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
      return router.parseUrl('/login');
  }
};