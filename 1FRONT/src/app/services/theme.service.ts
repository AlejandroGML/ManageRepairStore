import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'mrs-theme';
  private themeSubject = new BehaviorSubject<Theme>('light');
  theme$ = this.themeSubject.asObservable();

  constructor() {
    this.init();
  }

  private init(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    const osPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial: Theme = stored ?? (osPrefersDark ? 'dark' : 'light');
    this.applyTheme(initial);

    // Listen for OS preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(this.STORAGE_KEY)) {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  toggle(): void {
    const next = this.themeSubject.value === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
  }

  setTheme(theme: Theme): void {
    this.applyTheme(theme);
  }

  isDark(): boolean {
    return this.themeSubject.value === 'dark';
  }

  private applyTheme(theme: Theme): void {
    // Direct DOM API is more reliable than Renderer2 for HTML element attributes
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.themeSubject.next(theme);
  }
}
