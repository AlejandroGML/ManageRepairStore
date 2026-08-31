import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RefillGroup, Sale } from '../interface/warehouse';
import { getApiUrl } from './api-url';

@Injectable({
  providedIn: 'root'
})
export class SalesApiService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly url = getApiUrl();

  // Crear batch de refill atómico
  createRefillBatch(data: {
    products: Array<{ productId: number; quantity: number; operation: string; description?: string; sellingPrice?: number; costPrice?: number }>;
    technicianId?: number;
    orderId?: number;
    totalValue?: number;
  }): Observable<RefillGroup> {
    return this.http.post<RefillGroup>(`${this.url}/product/refills/batch`, data);
  }

  // Crear batch de venta atómico
  createSaleBatch(data: {
    products: Array<{ productId: number; quantity: number; sellingPrice: number; purchaseDiscount?: number; location?: string; description?: string }>;
    total: number;
  }): Observable<Sale> {
    return this.http.post<Sale>(`${this.url}/sales/batch`, data);
  }
}
