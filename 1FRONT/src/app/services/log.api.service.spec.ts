import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { LogApiService } from './log.api.service';
import { getApiUrl } from './api-url';

describe('LogApiService', () => {
  let service: LogApiService;
  let httpMock: HttpTestingController;
  const base = getApiUrl();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LogApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch the log via GET /log/data', () => {
    const mockLog: any = { userName: 'x', clientId: 1, clientName: 'y', action: 'z' };

    service.getData().subscribe((res) => expect(res).toEqual(mockLog));

    const req = httpMock.expectOne(`${base}/log/data`);
    expect(req.request.method).toBe('GET');
    req.flush(mockLog);
  });

  it('should post a log entry via POST /log', () => {
    const mockLog: any = { userName: 'x', clientId: 1, clientName: 'y', action: 'eliminó' };

    service.create(mockLog).subscribe((res) => expect(res).toEqual(mockLog));

    const req = httpMock.expectOne(`${base}/log`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockLog);
    req.flush(mockLog);
  });
});
