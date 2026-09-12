import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getApiUrl } from './api-url';

export interface Worker {
  id: number;
  name: string;
}

export interface WorkerBalanceRow {
  productId: number;
  name: string;
  assigned: number;
}

export interface WorkerMovementRow {
  id: number;
  date: string;
  worker: string;
  product: string;
  qty: number;
  description: string;
}

export interface WorkerMovementsPage {
  items: WorkerMovementRow[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class WorkersApiService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly url = getApiUrl();

  list(): Observable<Worker[]> {
    return this.http.get<Worker[]>(this.url + '/worker');
  }

  create(name: string): Observable<Worker> {
    return this.http.post<Worker>(this.url + '/worker', { name });
  }

  remove(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(this.url + '/worker/' + id);
  }

  balance(workerId: number): Observable<WorkerBalanceRow[]> {
    return this.http.get<WorkerBalanceRow[]>(`${this.url}/worker/${workerId}/balance`);
  }

  movements(limit = 20, offset = 0, workerId?: number): Observable<WorkerMovementsPage> {
    let path = `${this.url}/worker/movements?limit=${limit}&offset=${offset}`;
    if (workerId) path += `&workerId=${workerId}`;
    return this.http.get<WorkerMovementsPage>(path);
  }

  createMovements(
    workerId: number,
    products: Array<{ productId: number; quantity: number }>,
    detail?: string,
  ): Observable<{ created: number }> {
    return this.http.post<{ created: number }>(this.url + '/worker/movements', {
      workerId,
      products,
      detail,
    });
  }
}
