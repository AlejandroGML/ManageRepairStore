import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { RefillsComponent } from './refills.component';
import { SalesApiService } from '../../../services/sales.api.service';
import { ProductsApiService } from '../../../services/products.api.service';
import { DataSyncService } from '../../../services/data-sync.service';
import { SnackbarService } from '../../../services/snackbar.service';

describe('RefillsComponent', () => {
  let component: RefillsComponent;
  let fixture: ComponentFixture<RefillsComponent>;
  let salesApiSpy: jasmine.SpyObj<SalesApiService>;
  let productsApiSpy: jasmine.SpyObj<ProductsApiService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;

  const product = (id: number, name: string, stock = 10): any => ({
    id, name, stock, costPrice: 5000,
  });

  const historyPage = (total = 25): any => ({
    items: Array.from({ length: Math.min(20, total) }, (_, i) => ({
      id: 1000 - i,
      date: new Date().toISOString(),
      product: `producto ${i}`,
      qty: i === 0 ? -3 : 10,
      postStock: 50,
      description: i === 0 ? 'Descuento de stock · ajuste' : 'Reposición de stock · proveedor x',
    })),
    total,
  });

  beforeEach(async () => {
    salesApiSpy = jasmine.createSpyObj('SalesApiService', ['createRefillBatch']);
    productsApiSpy = jasmine.createSpyObj('ProductsApiService', [
      'searchProducts', 'getRefillHistory', 'getProductTransactions',
    ]);
    const syncSpy = jasmine.createSpyObj('DataSyncService', ['notifyTransactionUpdate']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['openSnackBar', 'success', 'error']);

    productsApiSpy.searchProducts.and.returnValue(of({ items: [product(7, 'cocina gas'), product(9, 'calefon')], total: 2 }));
    productsApiSpy.getRefillHistory.and.returnValue(of(historyPage()));
    salesApiSpy.createRefillBatch.and.returnValue(of({} as any));

    await TestBed.configureTestingModule({
      imports: [RefillsComponent],
      providers: [
        { provide: SalesApiService, useValue: salesApiSpy },
        { provide: ProductsApiService, useValue: productsApiSpy },
        { provide: DataSyncService, useValue: syncSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RefillsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load the first history page server-side (20 rows max)', () => {
    expect(productsApiSpy.getRefillHistory).toHaveBeenCalledWith(20, 0);
    expect(component.historyRows.length).toBe(20);
    expect(component.historyTotal).toBe(25);
  });

  it('should paginate the history server-side', () => {
    component.goHistoryPage(1);
    expect(productsApiSpy.getRefillHistory).toHaveBeenCalledWith(20, 20);
  });

  it('should search products server-side by the chosen field', fakeAsync(() => {
    component.searchField = 'location';
    component.searchQuery = 'BODEGA';
    component.onSearchChange();
    tick(250); // debounce
    expect(productsApiSpy.searchProducts).toHaveBeenCalledWith('BODEGA', 'location', 20);
    expect(component.searchResults.length).toBe(2);
  }));

  it('should select a product from results and clear the results list', () => {
    component.selectProduct(product(7, 'cocina gas'));
    expect(component.selectedProduct?.id).toBe(7);
    expect(component.searchResults).toEqual([]);
  });

  it('DOM-level: typing quantity into #refill-qty enables the submit button', () => {
    // Reproduce el flujo real del usuario: seleccionar producto por el
    // dropdown y ESCRIBIR la cantidad en el input (binding completo).
    component.selectProduct(product(7, 'cocina gas'));
    fixture.detectChanges();

    const qtyInput: HTMLInputElement = fixture.nativeElement.querySelector('#refill-qty');
    qtyInput.value = '10';
    qtyInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.quantity).toBe(10);
    expect(component.canSubmit).toBeTrue();

    const submitBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.entry-submit');
    expect(submitBtn.disabled).toBeFalse();
  });

  it('should warn when the quantity is negative', () => {
    component.quantity = -3;
    expect(component.isDiscount).toBeTrue();
  });

  it('should submit a discount with negative quantity and its operation', () => {
    component.selectProduct(product(7, 'cocina gas'));
    component.quantity = -3;
    component.detail = 'unidad dañada';
    component.registerEntry();

    const payload = salesApiSpy.createRefillBatch.calls.mostRecent().args[0];
    expect(payload.products[0].quantity).toBe(-3);
    expect(payload.products[0].operation).toBe('Descuento de stock');
    expect(payload.products[0].description).toBe('Descuento de stock · unidad dañada');
  });

  it('should submit a refill with positive quantity and the detail appended', () => {
    component.selectProduct(product(7, 'cocina gas'));
    component.quantity = 10;
    component.detail = 'proveedor x';
    component.registerEntry();

    const payload = salesApiSpy.createRefillBatch.calls.mostRecent().args[0];
    expect(payload.products[0].quantity).toBe(10);
    expect(payload.products[0].operation).toBe('Entrada Producto');
    expect(payload.products[0].description).toBe('Reposición de stock · proveedor x');
  });

  it('should reject zero quantity without calling the API', () => {
    component.selectProduct(product(7, 'cocina gas'));
    component.quantity = 0;
    component.registerEntry();
    expect(salesApiSpy.createRefillBatch).not.toHaveBeenCalled();
    expect(snackbarSpy.error).toHaveBeenCalled();
  });
});
