import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getApiUrl } from './api-url';

export interface CategoryRow {
  id: number;
  name: string;
  productCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class CategoriesApiService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly url = getApiUrl();

  getCategories(): Observable<CategoryRow[]> {
    return this.http.get<CategoryRow[]>(`${this.url}/category`);
  }

  createCategory(name: string): Observable<CategoryRow> {
    return this.http.post<CategoryRow>(`${this.url}/category`, { name });
  }

  updateCategory(id: number, name: string): Observable<CategoryRow> {
    return this.http.patch<CategoryRow>(`${this.url}/category/${id}`, { name });
  }

  deleteCategory(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.url}/category/${id}`);
  }
}
