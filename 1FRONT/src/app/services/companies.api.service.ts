import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Client } from '../interface/client';
import { getApiUrl } from './api-url';

/** Fila del listado de empresas (modal de gestión / autocomplete). */
export interface CompanyRow {
  id?: number;
  name: string;
  rutNormalizado: string;
  branchCount: number;
}

export interface CompanyListResult {
  items: CompanyRow[];
  total: number;
  page: number;
  limit: number;
}

/** Empresas (spec companies): listado, búsqueda, sucursales y renombre. */
@Injectable({
  providedIn: 'root',
})
export class CompaniesApiService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly url = getApiUrl();

  /** Búsqueda para el autocomplete de Registrar orden (nombre o rut). */
  search(q: string, limit = 8): Observable<CompanyListResult> {
    const params = `?q=${encodeURIComponent(q)}&limit=${limit}`;
    return this.http.get<CompanyListResult>(this.url + '/company' + params);
  }

  /** Listado paginado para el modal de gestión (10 por página). */
  list(page = 1, limit = 10, q = ''): Observable<CompanyListResult> {
    const params = `?page=${page}&limit=${limit}&q=${encodeURIComponent(q)}`;
    return this.http.get<CompanyListResult>(this.url + '/company' + params);
  }

  /** Sucursales (clientes activos) de una empresa. */
  clients(companyId: number): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.url}/company/${companyId}/clients`);
  }

  /** Renombrar empresa (409 si otra empresa activa usa el mismo nombre). */
  rename(id: number, name: string): Observable<CompanyRow> {
    return this.http.patch<CompanyRow>(`${this.url}/company/${id}`, { name });
  }
}
