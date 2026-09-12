import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Log } from '../interface/client';
import { getApiUrl } from './api-url';

/**
 * API del módulo de log (actividad del sistema).
 * Extraído de AdminApiService — un servicio por dominio.
 */
@Injectable({
  providedIn: 'root',
})
export class LogApiService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly url = getApiUrl();

  getData(): Observable<Log> {
    return this.http.get<Log>(this.url + '/log/data');
  }

  create(body: Log): Observable<Log> {
    return this.http.post<Log>(this.url + '/log', body);
  }
}
