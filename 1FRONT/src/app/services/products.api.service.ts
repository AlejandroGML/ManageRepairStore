import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../interface/warehouse';

/** Fila del historial de reposiciones/descuentos (server-side). */
export interface RefillHistoryRow {
  id: number;
  date: string;
  product: string;
  qty: number;
  postStock: number | null;
  description: string;
}
export interface RefillHistoryPage {
  items: RefillHistoryRow[];
  total: number;
}
import { getApiUrl } from './api-url';

@Injectable({
  providedIn: 'root'
})
export class ProductsApiService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly url = getApiUrl();

  // Crear un nuevo producto
  createProduct(product: FormData): Observable<Product> {
    return this.http.post<Product>(`${this.url}/product`, product);
  }

  // Buscar producto por ID
  searchProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.url}/product/by-id/${id}`);
  }

  // Buscar productos por nombre
  searchProductsByName(name: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.url}/product/by-name?name=${name}`);
  }

  // Buscar productos por ubicación
  searchProductsByLocation(location: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.url}/product/by-location?location=${location}`);
  }

  // Método para obtener la última transacción los productos
  /**
   * @deprecated Consider using getAllProducts() or getActiveProducts() instead.
   * Product.stock is now available directly from the backend.
   */
  getProductsWithLastTransaction(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.url}/product/LastTransaction`);
  }

  // Obtener productos activos (stock + minimum server-side)
  getActiveProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.url}/product/active`);
  }

  // Método para obtener las transacciones de un producto
  getProductTransactions(productId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/product/${productId}/transactions`);
  }

  // Método para crear una nueva transacción para un producto y actualizar nombre e imagen
  createProductTransaction(productId: number, transactionData: FormData): Observable<Product> {
    // Cambia la solicitud de PATCH a POST para que coincida con la configuración del backend
    return this.http.post<Product>(`${this.url}/product/${productId}/transaction`, transactionData);
  }

  // Método para verificar si un nombre de producto ya existe
  /** Búsqueda server-side con paginación y filtros (catálogo y reposiciones). */
  searchProducts(
    q: string,
    field: string,
    limit = 20,
    offset = 0,
    category = 'all',
    stock: 'all' | 'stock' | 'low' = 'all',
  ): Observable<{ items: Product[]; total: number }> {
    const params =
      `?q=${encodeURIComponent(q)}&field=${encodeURIComponent(field)}&limit=${limit}` +
      `&offset=${offset}&category=${encodeURIComponent(category)}&stock=${stock}`;
    return this.http.get<{ items: Product[]; total: number }>(this.url + '/product/search' + params);
  }

  /** Total de productos activos (encabezado del catálogo). */
  countActive(): Observable<number> {
    return this.http.get<number>(this.url + '/product/count');
  }

  /** Export XLSX de productos con stock bajo (server-side, con formato). */
  exportLowStockXlsx(): Observable<Blob> {
    return this.http.get(this.url + '/product/export/low-stock', { responseType: 'blob' });
  }

  /** Historial paginado de reposiciones y descuentos. */
  getRefillHistory(limit = 20, offset = 0): Observable<RefillHistoryPage> {
    return this.http.get<RefillHistoryPage>(`${this.url}/product/refills/history?limit=${limit}&offset=${offset}`);
  }

  checkProductNameExists(name: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.url}/product/exists?name=${encodeURIComponent(name)}`);
  }

  // Soft delete de un producto (backend: DELETE /product/delete/:id)
  softDeleteProduct(id: number): Observable<Product> {
    return this.http.delete<Product>(`${this.url}/product/delete/${id}`);
  }
}
