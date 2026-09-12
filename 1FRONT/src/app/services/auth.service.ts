import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { UserProfile } from '../interface/user-profile';
import { AuthApiService, LoginResponse } from './auth.api.service';

export { LoginResponse };

/**
 * Sesión del usuario: estado + persistencia + navegación.
 * El HTTP vive en AuthApiService; este servicio orquesta.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  private currentUserSubject = new BehaviorSubject<UserProfile | null>(
    this.getStoredUser()
  );
  currentUser$ = this.currentUserSubject.asObservable();

  private getStoredUser(): UserProfile | null {
    const stored = localStorage.getItem('current_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.authApi.login(email, password).pipe(
      tap((response) => {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem(
          'current_user',
          JSON.stringify(response.user)
        );
        this.currentUserSubject.next(response.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'admin';
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUserSubject.value;
  }
}
