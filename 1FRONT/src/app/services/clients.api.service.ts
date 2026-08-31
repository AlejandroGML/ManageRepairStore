import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { Client } from '../interface/client';
import { getApiUrl } from './api-url';

@Injectable({
  providedIn: 'root'
})
export class ClientsApiService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly url = getApiUrl();

  private waitingUsers: boolean = false;

  getAllClients(): Observable<Client[]> {
    if (this.waitingUsers) return new Observable();
    this.waitingUsers = true;
    return this.http.get<Client[]>(this.url + '/client/data').pipe(
      finalize(() => this.waitingUsers = false),
    );
  }
  findUserById(id: number): Observable<Client> {
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
}
