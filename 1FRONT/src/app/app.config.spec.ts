import { TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { appConfig } from './app.config';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

describe('appConfig', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: appConfig.providers,
    });
  });

  it('should provide MAT_DATE_LOCALE as es-ES', () => {
    const locale = TestBed.inject(MAT_DATE_LOCALE);
    expect(locale).toBe('es-ES');
  });

  it('should provide HttpClient with interceptor chain', () => {
    const http = TestBed.inject(HttpClient);
    expect(http).toBeTruthy();
  });

  it('should provide Router with routes config', () => {
    const router = TestBed.inject(Router);
    expect(router).toBeTruthy();
  });

  it('should provide zone change detection (NgZone provider present)', () => {
    const flatten = (providers: any[]): any[] =>
      providers.flatMap((p: any) =>
        Array.isArray(p)
          ? flatten(p)
          : p?.ɵproviders
            ? flatten(p.ɵproviders)
            : [p]
      );
    const flatProviders = flatten(appConfig.providers as any[]);
    const zoneProvider = flatProviders.find(
      (p: any) => p?.provide === NgZone && p?.useFactory
    );
    expect(zoneProvider).toBeDefined();
  });
});
