import { Component, inject } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService } from '../../../services/theme.service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [MatSlideToggleModule, MatIconModule, AsyncPipe],
  template: `
    <div class="theme-toggle">
      <mat-icon>light_mode</mat-icon>
      <mat-slide-toggle
        [checked]="(themeService.theme$ | async) === 'dark'"
        (change)="themeService.toggle()"
        aria-label="Alternar tema oscuro">
      </mat-slide-toggle>
      <mat-icon>dark_mode</mat-icon>
    </div>
  `,
  styles: [`
    .theme-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 8px;
    }
    .theme-toggle mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--color-text);
    }
  `]
})
export class ThemeToggleComponent {
  themeService = inject(ThemeService);
}
