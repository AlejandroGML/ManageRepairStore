import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private counter = 0;
  isLoading$ = this.isLoadingSubject.asObservable();
  constructor() { }
  setLoading(loading: boolean): void {
    if (loading) {
      this.counter++;
      if (this.counter === 1) this.isLoadingSubject.next(true);
    } else {
      this.counter = Math.max(0, this.counter - 1);
      if (this.counter === 0) this.isLoadingSubject.next(false);
    }
  }
}
