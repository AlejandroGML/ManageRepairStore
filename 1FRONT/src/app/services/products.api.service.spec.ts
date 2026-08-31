import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ProductsApiService } from './products.api.service';
import { getApiUrl } from './api-url';

describe('ProductsApiService', () => {
  let service: ProductsApiService;
  let httpMock: HttpTestingController;
  const base = getApiUrl();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should search a product by id via GET /product/by-id/:id', () => {
    const mockProduct: any = { id: 5, name: 'Batería' };

    service.searchProductById(5).subscribe((res) => expect(res).toEqual(mockProduct));

    const req = httpMock.expectOne(`${base}/product/by-id/5`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProduct);
  });

  it('should check name existence via GET /product/exists with encoded name', () => {
    service.checkProductNameExists('Laptop Pro').subscribe((res) => expect(res).toBeTrue());

    const req = httpMock.expectOne(`${base}/product/exists?name=${encodeURIComponent('Laptop Pro')}`);
    expect(req.request.method).toBe('GET');
    req.flush(true);
  });
});
