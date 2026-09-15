import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

/**
 * Impure by design: the language can change at runtime (shell switcher),
 * and an impure pipe re-evaluates on every CD cycle so the whole UI
 * flips without any component-level wiring. The corpus is small enough
 * that the CD cost is negligible.
 */
@Pipe({ name: 't', pure: false, standalone: true })
export class TPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string | undefined | null, params?: Record<string, string | number>): string {
    if (!key) return '';
    this.i18n.lang(); // track language signal
    return this.i18n.t(key, params);
  }
}
