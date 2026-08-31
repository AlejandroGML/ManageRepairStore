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
  getAllOrders(): Observable<Client[]> {
    return this.http.get<Client[]>(this.url + '/order/all');
  }
  findOrderByCode(code: string): Observable<Client> {
    return this.http.get<Client>(this.url + '/order/code/' + code);
  }
  registerOrder(body: OrdenIngreso): Observable<Client> {
    return this.http.post<Client>(this.url + '/order', body);
  }
  updateOrderStatus(order: Order): Observable<Order> {
    return this.http.patch<Order>(this.url + '/order/status/' + order.id, order);
  }
}
