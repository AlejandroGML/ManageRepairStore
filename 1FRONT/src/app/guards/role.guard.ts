import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (requiredRole: string): CanActivateFn => {
  return () => {
    const router = inject(Router);
    const authService = inject(AuthService);
    const user = authService.getCurrentUser();
    if (user && user.role === requiredRole) {
      return true;
    }
    router.navigate(['/login']);
    return false;
  };
};
