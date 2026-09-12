import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { OrdersApiService } from './orders.api.service';
import { getApiUrl } from './api-url';

describe('OrdersApiService', () => {
  let service: OrdersApiService;
  let httpMock: HttpTestingController;
  const base = getApiUrl();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrdersApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should find an order by code via GET /order/code/:code', () => {
    const mockOrder: any = { id: 1, code: 'ORD-1' };

    service.findOrderByCode('ORD-1').subscribe((res) => expect(res).toEqual(mockOrder));

    const req = httpMock.expectOne(`${base}/order/code/ORD-1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockOrder);
  });

  it('should register an order via POST /order', () => {
    const body: any = {
      name: 'X', rut: '1', address: 'a', city: 'c',
      phone: '1', description: 'd', observation: 'o',
    };
    const mockResponse: any = { id: 5 };

    service.create(body).subscribe((res) => expect(res).toEqual(mockResponse));

    const req = httpMock.expectOne(`${base}/order`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(mockResponse);
  });

  it('should fetch all orders via GET /order/all', () => {
    const mockOrders: any[] = [{ id: 1, orders: [{ id: 10 }] }];

    service.getAllOrders().subscribe((res) => expect(res).toEqual(mockOrders));

    const req = httpMock.expectOne(`${base}/order/all`);
    expect(req.request.method).toBe('GET');
    req.flush(mockOrders);
  });
});
