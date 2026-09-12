import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SystemUser } from '../interface/system-user';

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'seller' | 'warehouse';
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'seller' | 'warehouse';
  active?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly http = inject(HttpClient);

  private getBackendUrl(): string {
    if (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ) {
      return 'http://localhost:3000';
    }
    return 'http://192.168.50.101:3000';
  }

  /** Exposed for testing only. */
  getBaseUrlForTest(): string {
    return this.getBackendUrl();
  }

  getAll(): Observable<SystemUser[]> {
    return this.http.get<SystemUser[]>(`${this.getBackendUrl()}/users`);
  }

  getById(id: number): Observable<SystemUser> {
    return this.http.get<SystemUser>(`${this.getBackendUrl()}/users/${id}`);
  }

  create(dto: CreateUserDto): Observable<SystemUser> {
    return this.http.post<SystemUser>(`${this.getBackendUrl()}/users`, dto);
  }

  update(id: number, dto: UpdateUserDto): Observable<SystemUser> {
    return this.http.patch<SystemUser>(
      `${this.getBackendUrl()}/users/${id}`,
      dto
    );
  }

  deactivate(id: number): Observable<SystemUser> {
    return this.http.patch<SystemUser>(
      `${this.getBackendUrl()}/users/${id}`,
      { active: false }
    );
  }

  /** Reactiva un usuario desactivado. */
  activate(id: number): Observable<SystemUser> {
    return this.http.patch<SystemUser>(
      `${this.getBackendUrl()}/users/${id}`,
      { active: true }
    );
  }

  /** Borrado definitivo (solo usuarios ya desactivados). */
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.getBackendUrl()}/users/${id}`);
  }
}
