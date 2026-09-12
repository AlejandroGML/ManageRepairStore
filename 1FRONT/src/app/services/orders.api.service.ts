import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Client, Order } from '../interface/client';
import { OrdenIngreso } from '../interface/ficha-tecnica';
import { getApiUrl } from './api-url';

@Injectable({
  providedIn: 'root'
})
export class OrdersApiService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly url = getApiUrl();

  findOrderByUser(user: Client): Observable<Client> {
    return this.http.get<Client>(this.url + '/order/user/' + user.id);
  }
  findOrderByCode(code: string): Observable<Client> {
    return this.http.get<Client>(this.url + '/order/code/' + code);
  }
  create(body: OrdenIngreso): Observable<Client> {
    return this.http.post<Client>(this.url + '/order', body);
  }
  updateStatus(order: Order): Observable<Order> {
    return this.http.patch<Order>(this.url + '/order/status/' + order.id, order);
  }

  /** GET /order/all — clientes con sus órdenes (antes en AdminApiService). */
  getAllOrders(): Observable<any[]> {
    return this.http.get<any[]>(this.url + '/order/all');
  }

  /** GET /order/recent — últimas órdenes globales (panel del finder). */
  getRecentOrders(limit = 6): Observable<{ items: any[]; total: number }> {
    return this.http.get<{ items: any[]; total: number }>(this.url + '/order/recent?limit=' + limit);
  }
}
