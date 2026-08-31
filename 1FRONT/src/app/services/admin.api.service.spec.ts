import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AdminApiService } from './admin.api.service';
import { getApiUrl } from './api-url';

describe('AdminApiService', () => {
  let service: AdminApiService;
  let httpMock: HttpTestingController;
  const base = getApiUrl();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch the log via GET /log/data', () => {
    const mockLog: any = { userName: 'x', clientId: 1, clientName: 'y', action: 'z' };

    service.getLog().subscribe((res) => expect(res).toEqual(mockLog));

    const req = httpMock.expectOne(`${base}/log/data`);
    expect(req.request.method).toBe('GET');
    req.flush(mockLog);
  });

  it('should fetch active users via GET /users', () => {
    const mockUsers: any[] = [{ id: 1, name: 'Técnico' }];

    service.getActiveUsers().subscribe((res) => expect(res).toEqual(mockUsers));

    const req = httpMock.expectOne(`${base}/users`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);
  });
});
