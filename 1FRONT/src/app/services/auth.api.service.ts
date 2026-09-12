import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserProfile } from '../interface/user-profile';
import { getApiUrl } from './api-url';

export interface LoginResponse {
  access_token: string;
  user: UserProfile;
}

/**
 * HTTP del módulo auth — sin estado, sin localStorage, sin navegación.
 * AuthService orquesta sesión por encima de este.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly url = getApiUrl();

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.url}/auth/login`, {
      email,
      password,
    });
  }

  changePassword(
    currentPassword: string,
    newPassword: string,
  ): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(
      `${this.url}/auth/password`,
      { currentPassword, newPassword },
    );
  }
}
