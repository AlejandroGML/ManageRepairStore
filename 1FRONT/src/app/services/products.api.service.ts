import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../interface/warehouse';
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
  checkProductNameExists(name: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.url}/product/exists?name=${encodeURIComponent(name)}`);
  }
}
