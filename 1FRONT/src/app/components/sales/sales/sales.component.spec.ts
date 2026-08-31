import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError, delay } from 'rxjs';

import { SalesComponent } from './sales.component';
import { SalesApiService } from 'src/app/services/sales.api.service';
import { DataSyncService } from 'src/app/services/data-sync.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { Product } from 'src/app/interface/warehouse';

describe('SalesComponent', () => {
  let component: SalesComponent;
  let fixture: ComponentFixture<SalesComponent>;
  let salesApiSpy: jasmine.SpyObj<SalesApiService>;
  let dataSyncSpy: jasmine.SpyObj<DataSyncService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;

  const mockProduct: Product = {
    id: 1,
    name: 'Test Product',
    quantity: 10,
    stock: 10,
    transactions: [
      {
        id: 1,
        operation: 'Nuevo Producto',
        quantity: 10,
        sellingPrice: 500,
        maxDiscount: 100,
        purchaseDiscount: 0,
        location: 'A1',
      },
    ],
  };

  beforeEach(async () => {
    salesApiSpy = jasmine.createSpyObj('SalesApiService', [
      'createSaleBatch',
    ]);
    dataSyncSpy = jasmine.createSpyObj('DataSyncService', ['notifyTransactionUpdate']);
    dataSyncSpy.transactionUpdated$ = of();
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['success', 'error', 'openSnackBar']);

    await TestBed.configureTestingModule({
      imports: [SalesComponent, NoopAnimationsModule],
      providers: [
        { provide: SalesApiService, useValue: salesApiSpy },
        { provide: DataSyncService, useValue: dataSyncSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with submitting = false', () => {
    expect(component.submitting).toBeFalse();
  });

  it('should render the sales table', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const table = compiled.querySelector('table');
    expect(table).toBeTruthy();
  });

  it('should render "Buscar Producto" button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll('button'));
    const searchBtn = buttons.find(btn => btn.textContent?.includes('Buscar Producto'));
    expect(searchBtn).toBeTruthy();
  });

  it('should display "Realizar Venta" button when not submitting', () => {
    component.submitting = false;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('.purchase-button') as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.textContent?.trim()).toContain('Realizar Venta');
    expect(button.disabled).toBeFalse();
  });

  it('should disable button and show "Procesando..." when submitting', () => {
    component.submitting = true;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('.purchase-button') as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.disabled).toBeTrue();
    expect(button.textContent?.trim()).toContain('Procesando...');
  });

  it('should not complete sale if submitting is already true', () => {
    component.submitting = true;
    component.completeSale();
    expect(salesApiSpy.createSaleBatch).not.toHaveBeenCalled();
  });

  it('should not complete sale with empty dataSource', () => {
    component.dataSource.data = [];
    component.completeSale();
    expect(salesApiSpy.createSaleBatch).not.toHaveBeenCalled();
  });

  it('should call createSaleBatch with correct payload and handle success', fakeAsync(() => {
    component.dataSource.data = [
      {
        ...mockProduct,
        quantity: 2,
        purchaseDiscount: 10,
        sellingPrice: 500,
        finalValue: 990,
        maxDiscount: 100,
        id: 1,
      },
    ];
    component.totalSaleValue = 990;
    component.submitting = false;

    salesApiSpy.createSaleBatch.and.returnValue(of({ id: 1, total: 990 }).pipe(delay(0)));

    component.completeSale();

    expect(component.submitting).toBeTrue();
    expect(salesApiSpy.createSaleBatch).toHaveBeenCalledWith({
      products: [
        {
          productId: 1,
          quantity: -2,
          sellingPrice: 500,
          purchaseDiscount: 10,
          location: 'Sin Datos',
          description: '',
        },
      ],
      total: 990,
    });

    tick();

    // Verify success flow
    expect(component.dataSource.data).toEqual([]);
    expect(component.totalSaleValue).toBe(0);
    expect(component.submitting).toBeFalse();
    expect(snackbarSpy.success).toHaveBeenCalledWith('Venta realizada correctamente');
    expect(dataSyncSpy.notifyTransactionUpdate).toHaveBeenCalled();
  }));

  it('should handle error and re-enable submitting', () => {
    component.dataSource.data = [
      {
        ...mockProduct,
        quantity: 1,
        purchaseDiscount: 0,
        sellingPrice: 500,
        finalValue: 500,
        maxDiscount: 100,
        id: 1,
      },
    ];
    component.totalSaleValue = 500;

    salesApiSpy.createSaleBatch.and.returnValue(
      throwError(() => ({ error: { message: 'Insufficient stock' } }))
    );

    component.completeSale();

    expect(component.submitting).toBeFalse();
    expect(snackbarSpy.error).toHaveBeenCalledWith('Insufficient stock');
    // Data should NOT be cleared on error
  });

  it('should clear dataSource on successful sale', () => {
    component.dataSource.data = [
      { ...mockProduct, quantity: 1, purchaseDiscount: 0, sellingPrice: 100, finalValue: 100, maxDiscount: 0, id: 1 },
    ];
    component.totalSaleValue = 100;

    salesApiSpy.createSaleBatch.and.returnValue(of({ id: 2, total: 100 }));

    component.completeSale();

    expect(component.dataSource.data).toEqual([]);
    expect(component.totalSaleValue).toBe(0);
  });

  it('should calculate totalSaleValue correctly', () => {
    component.dataSource.data = [
      { ...mockProduct, quantity: 2, purchaseDiscount: 0, sellingPrice: 500, finalValue: 1000, maxDiscount: 100, id: 1 },
      { ...mockProduct, quantity: 1, purchaseDiscount: 0, sellingPrice: 300, finalValue: 300, maxDiscount: 50, id: 2 },
    ];
    component.updateTotalSaleValue();
    expect(component.totalSaleValue).toBe(1300);
  });
});
