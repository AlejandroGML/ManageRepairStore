import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataSyncService {
  private transactionUpdateSource = new Subject<void>();
  transactionUpdated$ = this.transactionUpdateSource.asObservable();

  notifyTransactionUpdate(): void {
    this.transactionUpdateSource.next();
  }
}