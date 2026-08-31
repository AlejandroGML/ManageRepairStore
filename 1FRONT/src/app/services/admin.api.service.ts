import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Log } from '../interface/client';
import { getApiUrl } from './api-url';

@Injectable({
  providedIn: 'root'
})
export class AdminApiService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly url = getApiUrl();

  getLog(): Observable<Log> {
    return this.http.get<Log>(this.url + '/log/data');
  }
  addLog(body: Log): Observable<Log> {
    return this.http.post<Log>(this.url + '/log', body);
  }

  // Obtener usuarios activos (técnicos)
  getActiveUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/users`);
  }

  // Obtener órdenes abiertas
  getAllOrders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/order/all`);
  }
}
