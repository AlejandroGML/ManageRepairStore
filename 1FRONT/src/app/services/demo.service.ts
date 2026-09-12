import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { getApiUrl } from './api-url';

/**
 * Demo ephemerality: every full page load resets the backend to the original
 * synthetic seed, so a visitor's edits vanish on refresh while every feature
 * (search, exports, PDFs, activity feed) keeps working server-side for real.
 *
 * Fired once per bootstrap from `provideAppInitializer` in app.config.ts.
 */
@Injectable({ providedIn: 'root' })
export class DemoService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Best-effort: a failed or slow reset never blocks the app from booting,
   * but when it succeeds the first data fetch already sees fresh demo data.
   */
  async resetOnBoot(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${getApiUrl()}/demo/reset`, {}).pipe(timeout(10000)),
      );
    } catch {
      // Ignore: offline backend / demo mode disabled — the app still boots.
    }
  }
}
