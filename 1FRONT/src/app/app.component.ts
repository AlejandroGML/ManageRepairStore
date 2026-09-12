import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { LoadingService } from './services/loading.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatProgressSpinnerModule],
})
export class AppComponent implements OnInit, OnDestroy {
  isLoading: boolean = false;
  currentDay: Date = new Date();

  private readonly loadingService = inject(LoadingService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private loadingSubscription?: Subscription;
  private authSubscription?: Subscription;
  private sessionInterval?: ReturnType<typeof setInterval>;
  private userLogged = false;

  ngOnInit() {
    this.loadingSubscription = this.loadingService.isLoading$.subscribe((value) => {
      this.isLoading = value;
      this.cdr.detectChanges();
    });

    this.authSubscription = this.authService.currentUser$.subscribe((user) => {
      this.userLogged = !!user;
    });

    this.checkSessionDay();
  }

  ngOnDestroy() {
    this.loadingSubscription?.unsubscribe();
    this.authSubscription?.unsubscribe();
    if (this.sessionInterval) clearInterval(this.sessionInterval);
  }

  checkSessionDay() {
    this.sessionInterval = setInterval(() => {
      const now = new Date();
      if (this.currentDay.getDay() !== now.getDay()) {
        this.currentDay = new Date();
        if (this.userLogged) window.location.reload();
      }
    }, 1000 * 60);
  }
}
