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

  it('should fetch all clients from /client/data', () => {
    const mockClients: any[] = [{ id: 1, name: 'ACME' }];

    service.getAllClients().subscribe((clients) => expect(clients).toEqual(mockClients));

    const req = httpMock.expectOne(`${base}/client/data`);
    expect(req.request.method).toBe('GET');
    req.flush(mockClients);
  });

  it('should update a client via PATCH /client/:id', () => {
    const client: any = { id: 7, name: 'ACME', phone: '123' };

    service.updateUser(client).subscribe((res) => expect(res).toEqual(client));

    const req = httpMock.expectOne(`${base}/client/7`);
    expect(req.request.method).toBe('PATCH');
    req.flush(client);
  });
});
