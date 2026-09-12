import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DemoService } from './demo.service';

describe('DemoService', () => {
  let service: DemoService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://localhost:3000';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DemoService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DemoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('posts to /demo/reset on boot', async () => {
    const promise = service.resetOnBoot();

    const req = httpMock.expectOne(`${apiUrl}/demo/reset`);
    expect(req.request.method).toBe('POST');
    req.flush({ resetAt: '2026-01-01T00:00:00.000Z' });

    await expectAsync(promise).toBeResolved();
  });

  it('never blocks boot when the reset is rejected (demo mode disabled)', async () => {
    const promise = service.resetOnBoot();

    const req = httpMock.expectOne(`${apiUrl}/demo/reset`);
    req.flush({ message: 'Demo mode is disabled' }, { status: 403, statusText: 'Forbidden' });

    await expectAsync(promise).toBeResolved();
  });

  it('never blocks boot when the backend is unreachable', async () => {
    const promise = service.resetOnBoot();

    const req = httpMock.expectOne(`${apiUrl}/demo/reset`);
    req.error(new ProgressEvent('error'));

    await expectAsync(promise).toBeResolved();
  });
});
