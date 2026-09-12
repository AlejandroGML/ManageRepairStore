import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RefillGroup, Sale } from '../interface/warehouse';
import { SalesTodaySummary } from '../interface/sales-summary';
import { getApiUrl } from './api-url';

/** Ítem del comprobante de venta (resumen del carrito). */
export interface SalePdfItem {
  name: string;
  quantity: number;
  sellingPrice: number;
  purchaseDiscount: number;
  finalValue: number;
}

export interface SalePdfPayload {
  code: string;
  date: string;
  seller?: string;
  products: SalePdfItem[];
  subtotal: number;
  discount: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class SalesApiService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly url = getApiUrl();

  // Resumen de ventas de hoy (KPI panel)
  getTodaySummary(): Observable<SalesTodaySummary> {
    return this.http.get<SalesTodaySummary>(`${this.url}/sales`);
  }

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

  // Comprobante PDF de venta (server-side, Puppeteer)
  generateSalePdf(data: SalePdfPayload): Observable<Blob> {
    return this.http.post(`${this.url}/sales/pdf`, data, { responseType: 'blob' });
  }
}
