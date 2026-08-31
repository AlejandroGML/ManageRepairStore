import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../../../services/theme.service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule, AsyncPipe],
  template: `
    <button
      class="icon-btn theme-btn"
      (click)="themeService.toggle()"
      [matTooltip]="(themeService.theme$ | async) === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
      attr.aria-label="{{ (themeService.theme$ | async) === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro' }}">
      <mat-icon>{{ (themeService.theme$ | async) === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `,
  styles: [`
    .theme-btn {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
    }
  `]
})
export class ThemeToggleComponent {
  themeService = inject(ThemeService);
}