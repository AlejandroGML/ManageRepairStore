import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { LoadingService } from './services/loading.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [RouterOutlet, MatProgressSpinnerModule],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'manage-repair-store';
  isLoading: boolean = false;

  private readonly loadingService = inject(LoadingService);
  private readonly cdr = inject(ChangeDetectorRef);
  private loadingSubscription?: Subscription;

  ngOnInit() {
    this.loadingSubscription = this.loadingService.isLoading$.subscribe(value => {
      this.isLoading = value;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    this.loadingSubscription?.unsubscribe();
  }
}