import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SalesApiService } from './sales.api.service';
import { getApiUrl } from './api-url';

describe('SalesApiService', () => {
  let service: SalesApiService;
  let httpMock: HttpTestingController;
  const base = getApiUrl();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SalesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create a sale batch via POST /sales/batch', () => {
    const body: any = {
      products: [{ productId: 1, quantity: 2, sellingPrice: 500 }],
      total: 1000,
    };
    const mockSale: any = { id: 1, total: 1000 };

    service.createSaleBatch(body).subscribe((res) => expect(res).toEqual(mockSale));

    const req = httpMock.expectOne(`${base}/sales/batch`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(mockSale);
  });

  it('should create a refill batch via POST /product/refills/batch', () => {
    const body: any = {
      products: [{ productId: 1, quantity: 2, operation: 'IN' }],
      orderId: 9,
    };
    const mockGroup: any = { id: 1 };

    service.createRefillBatch(body).subscribe((res) => expect(res).toEqual(mockGroup));

    const req = httpMock.expectOne(`${base}/product/refills/batch`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(mockGroup);
  });
});
