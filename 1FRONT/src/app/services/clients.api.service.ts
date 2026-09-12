import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Client } from '../interface/client';
import { getApiUrl } from './api-url';

/** Empresa inscrita (autocomplete de Registrar orden). */
export interface CompanyInfo {
  name: string;
  rut?: string;
  sucursales: number;
}

/** Campo de coincidencia detectado en el chequeo anti-duplicados. */
export interface DuplicateField {
  field: string;
  value: string;
  similarity: number;
}

/** Coincidencia de cliente en el chequeo anti-duplicados. */
export interface DuplicateMatch {
  client: Client;
  fields: DuplicateField[];
}

export interface DuplicateCheckResult {
  count: number;
  matches: DuplicateMatch[];
}

/** Resultado de búsqueda server-side del finder. */
export interface ClientSearchResult {
  items: Array<Client & { orderCount: number }>;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class ClientsApiService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly url = getApiUrl();

  /** Export XLSX de clientes con formato (server-side). */
  exportClients(): Observable<Blob> {
    return this.http.get(this.url + '/client/export', { responseType: 'blob' });
  }
  getUserById(id: number): Observable<Client> {
    return this.http.get<Client>(this.url + '/client/' + id);
  }
  findUserByRut(rut: string): Observable<Client[]> {
    return this.http.get<Client[]>(this.url + '/client/by-rut/' + rut);
  }
  findUserByName(name: string): Observable<Client[]> {
    return this.http.get<Client[]>(this.url + '/client/by-name/' + name);
  }
  findUserByAddress(address: string): Observable<Client[]> {
    return this.http.get<Client[]>(this.url + '/client/by-address/' + address);
  }
  updateUser(user: Client): Observable<Client> {
    return this.http.patch<Client>(this.url + '/client/' + user.id, user);
  }
  deleteUserById(id: number): Observable<number> {
    return this.http.delete<number>(this.url + '/client/' + id);
  }
  getCountClients(): Observable<number> {
    return this.http.get<number>(this.url + '/client/count');
  }
  /** Empresas inscritas para el autocomplete de "Registrar orden". */
  getCompanies(): Observable<CompanyInfo[]> {
    return this.http.get<CompanyInfo[]>(this.url + '/client/companies');
  }
  /** Chequeo anti-duplicados antes de registrar una orden. */
  checkDuplicates(input: {
    name?: string;
    rut?: string;
    address?: string;
    phone?: string;
    email?: string;
    company_name?: string;
    has_company?: boolean;
  }): Observable<DuplicateCheckResult> {
    return this.http.post<DuplicateCheckResult>(this.url + '/client/duplicates-check', input);
  }

  /** Búsqueda server-side (finder): evita descargar todos los clientes. */
  searchClients(q: string, field: string, limit = 100): Observable<ClientSearchResult> {
    const params = `?q=${encodeURIComponent(q)}&field=${encodeURIComponent(field)}&limit=${limit}`;
    return this.http.get<ClientSearchResult>(this.url + '/client/search' + params);
  }
}
