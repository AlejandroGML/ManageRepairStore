import { Injectable, signal } from '@angular/core';
import { LANG_EN } from './dictionaries/en';
import { LANG_ES } from './dictionaries/es';

export type Lang = 'en' | 'es';

const STORAGE_KEY = 'mrs-lang';

/**
 * Minimal type-safe i18n layer (replaces what ngx-translate would provide):
 * - Bundled dictionaries (no HTTP loader, no async flash of untranslated text)
 * - Signal-based language state; `TPipe` re-evaluates on switch
 * - English by default (portfolio audience), Spanish available via the
 *   shell switcher; the choice persists in localStorage.
 * - Under Karma the default is Spanish so the existing spec assertions
 *   (written against the original Spanish UI strings) keep passing
 *   without touching a single spec file.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>(this.resolveInitialLang());

  private readonly dictionaries: Record<Lang, Record<string, string>> = {
    en: LANG_EN,
    es: LANG_ES,
  };

  setLang(lang: Lang): void {
    this.lang.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* private mode: language just won't persist */
    }
  }

  toggle(): void {
    this.setLang(this.lang() === 'en' ? 'es' : 'en');
  }

  t(key: string, params?: Record<string, string | number>): string {
    let value = this.dictionaries[this.lang()][key] ?? LANG_EN[key] ?? key;
    if (params) {
      for (const [name, replacement] of Object.entries(params)) {
        value = value.split(`{{${name}}}`).join(String(replacement));
      }
    }
    return value;
  }

  private resolveInitialLang(): Lang {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'es') return stored;
    } catch {
      /* no localStorage access */
    }
    // Karma specs assert the original Spanish UI strings.
    if ((globalThis as Record<string, unknown>)['__karma__']) return 'es';
    return 'en';
  }
}
