import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { LoadingService } from './services/loading.service';
import { AuthService } from './services/auth.service';
import { UserProfile } from './interface/user-profile';
import { NavbarComponent } from './components/shared/navbar/navbar.component';
import { FormComponent } from './components/shared/form/form.component';
import { LoginComponent } from './components/shared/login/login.component';
import { FooterComponent } from './components/shared/footer/footer.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, FormsModule, ReactiveFormsModule,
    MatProgressSpinnerModule,
    NavbarComponent, FormComponent, LoginComponent, FooterComponent,
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'manage-repair-store';
  isLoading: boolean = false;
  userLogged: UserProfile | undefined = undefined;
  currentDay: Date = new Date();

  private readonly loadingService = inject(LoadingService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private authSubscription?: Subscription;
  private sessionInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.loadingService.isLoading$.subscribe(value => {
      this.isLoading = value;
      this.cdr.detectChanges();
    });

    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.userLogged = user ?? undefined;
      this.cdr.detectChanges();
    });

    this.checkSessionDay();
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
    if (this.sessionInterval) clearInterval(this.sessionInterval);
  }

  setLogged(value?: UserProfile) {
    this.userLogged = value;
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
