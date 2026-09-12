import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ClientsApiService } from './clients.api.service';
import { getApiUrl } from './api-url';

describe('ClientsApiService', () => {
  let service: ClientsApiService;
  let httpMock: HttpTestingController;
  const base = getApiUrl();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClientsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should download the clients CSV blob from /client/export', () => {
    const csv = new Blob(['a;b'], { type: 'text/csv' });

    service.exportClients().subscribe((blob) => expect(blob).toEqual(csv));

    const req = httpMock.expectOne(`${base}/client/export`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(csv);
  });

  it('should update a client via PATCH /client/:id', () => {
    const client: any = { id: 7, name: 'ACME', phone: '123' };

    service.updateUser(client).subscribe((res) => expect(res).toEqual(client));

    const req = httpMock.expectOne(`${base}/client/7`);
    expect(req.request.method).toBe('PATCH');
    req.flush(client);
  });
});
