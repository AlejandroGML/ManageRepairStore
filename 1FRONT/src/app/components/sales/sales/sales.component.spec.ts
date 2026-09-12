import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { SalesComponent } from './sales.component';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { SalesApiService } from 'src/app/services/sales.api.service';
import { DataSyncService } from 'src/app/services/data-sync.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { AuthService } from 'src/app/services/auth.service';
import { Product } from 'src/app/interface/warehouse';

describe('SalesComponent', () => {
  let component: SalesComponent;
  let fixture: ComponentFixture<SalesComponent>;
  let productsApiSpy: jasmine.SpyObj<ProductsApiService>;
  let salesApiSpy: jasmine.SpyObj<SalesApiService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let dataSyncSpy: jasmine.SpyObj<DataSyncService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const products: Product[] = [
    { id: 1, name: 'Aceite 10W40', quantity: 0, stock: 4, minimum: 5, sellingPrice: 15000, transactions: [{ id: 1, operation: 'Nuevo Producto', quantity: 10, sellingPrice: 15000, maxDiscount: 2000 }], category: { id: 1, name: 'Lubricantes' } as any },
    { id: 2, name: 'Filtro de aire', quantity: 0, stock: 12, minimum: 5, sellingPrice: 8000, transactions: [{ id: 2, operation: 'Nuevo Producto', quantity: 10, sellingPrice: 8000, maxDiscount: 1000 }], category: { id: 2, name: 'Filtros' } as any },
    { id: 3, name: 'Gas 5kg', quantity: 0, stock: 0, minimum: 5, sellingPrice: 22000, transactions: [{ id: 3, operation: 'Nuevo Producto', quantity: 10, sellingPrice: 22000, maxDiscount: 0 }], category: { id: 1, name: 'Lubricantes' } as any },
  ];

  beforeEach(async () => {
    productsApiSpy = jasmine.createSpyObj('ProductsApiService', ['getActiveProducts']);
    salesApiSpy = jasmine.createSpyObj('SalesApiService', ['createSaleBatch', 'generateSalePdf']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    dataSyncSpy = jasmine.createSpyObj('DataSyncService', ['notifyTransactionUpdate']);
    dataSyncSpy.transactionUpdated$ = of();
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['success', 'error', 'info', 'openSnackBar']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authServiceSpy.getCurrentUser.and.returnValue(null);

    productsApiSpy.getActiveProducts.and.returnValue(of(products));
    salesApiSpy.generateSalePdf.and.returnValue(of(new Blob(['pdf'])));
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:fake');
    spyOn(window.URL, 'revokeObjectURL');

    await TestBed.configureTestingModule({
      imports: [SalesComponent, NoopAnimationsModule],
      providers: [
        { provide: ProductsApiService, useValue: productsApiSpy },
        { provide: SalesApiService, useValue: salesApiSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: DataSyncService, useValue: dataSyncSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    // MatDialogModule provides MatDialog at module level (Material 21),
    // shadowing the root TestBed provider — override at component level.
    TestBed.overrideComponent(SalesComponent, {
      set: { providers: [{ provide: MatDialog, useValue: dialogSpy }] },
    });

    fixture = TestBed.createComponent(SalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render product tiles with icon, category and price', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const tiles = compiled.querySelectorAll('.product-tile');
    expect(tiles.length).toBe(3);
    expect(compiled.textContent).toContain('Aceite 10W40');
    expect(compiled.textContent).toContain('Lubricantes');
    const prices = Array.from(compiled.querySelectorAll('.pt-price'));
    expect(prices.length).toBe(3);
    expect(prices.every((p) => (p.textContent ?? '').trim().length > 0)).toBeTrue();
  });

  it('should disable tiles with 0 stock', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const tiles = Array.from(compiled.querySelectorAll('.product-tile'));
    const outOfStock = tiles.find((t) => t.textContent?.includes('Gas 5kg'));
    expect(outOfStock?.hasAttribute('disabled')).toBeTrue();
  });

  it('should narrow tiles via search', () => {
    component.catalogQuery = 'filtro';
    component.filterCatalog();
    expect(component.catalogFiltered.length).toBe(1);
    expect(component.catalogFiltered[0].name).toBe('Filtro de aire');
  });

  it('should narrow tiles via category filter', () => {
    component.categoryFilter = 'Filtros';
    component.onCategoryChange();
    expect(component.catalogFiltered.length).toBe(1);
  });

  it('should show the empty state when the catalog has no products', () => {
    productsApiSpy.getActiveProducts.and.returnValue(of([]));
    (component as any).loadCatalog();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state')).toBeTruthy();
    expect(compiled.textContent).toContain('Sin resultados');
  });

  it('should add product to cart and recompute totals', () => {
    component.addProductToSale(products[0]);
    expect(component.cartItems.length).toBe(1);
    expect(component.totalSaleValue).toBe(15000);

    component.adjustQuantity(0, 2);
    expect(component.totalSaleValue).toBe(30000);
  });

  it('should block adding the same product twice', () => {
    component.addProductToSale(products[0]);
    component.addProductToSale(products[0]);
    expect(component.cartItems.length).toBe(1);
    expect(snackbarSpy.openSnackBar).toHaveBeenCalled();
  });

  it('should clamp quantity to the available stock', () => {
    component.addProductToSale(products[0]); // stock 4
    component.adjustQuantity(0, 99);
    expect(component.cartItems[0].quantity).toBe(4);
    expect(component.totalSaleValue).toBe(60000);

    component.adjustQuantity(0, 0);
    expect(component.cartItems[0].quantity).toBe(1);
  });

  it('should mark catalog tiles already in the cart', () => {
    component.addProductToSale(products[0]);
    expect(component.isInCart(products[0])).toBeTrue();
    expect(component.isInCart(products[1])).toBeFalse();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const inCartTiles = compiled.querySelectorAll('.product-tile.tile-in-cart');
    expect(inCartTiles.length).toBe(1);
    expect(compiled.textContent).toContain('En el carrito');
  });

  it('should generate the sale PDF from the cart summary (server-side)', () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    salesApiSpy.generateSalePdf.and.returnValue(of(blob));

    component.addProductToSale(products[0]); // 15000
    component.addProductToSale(products[1]); // 8000
    component.applyDiscount(1, 500);
    component.generatePurchasePdf();

    expect(salesApiSpy.generateSalePdf).toHaveBeenCalled();
    const payload = salesApiSpy.generateSalePdf.calls.mostRecent().args[0];
    expect(payload.products.length).toBe(2);
    expect(payload.products[0].name).toBe('Aceite 10W40');
    expect(payload.products[0].quantity).toBe(1);
    expect(payload.subtotal).toBe(23000);
    expect(payload.discount).toBe(500);
    expect(payload.total).toBe(22500);
    expect(payload.code).toContain('VENTA-');
  });

  it('should NOT request the sale PDF when the cart is empty', () => {
    component.generatePurchasePdf();
    expect(salesApiSpy.generateSalePdf).not.toHaveBeenCalled();
  });

  it('should read the discount cap from the last non-sale transaction', () => {
    const sold: Product = {
      id: 9,
      name: 'Producto con venta al final',
      quantity: 0,
      stock: 10,
      sellingPrice: 5000,
      transactions: [
        { id: 10, operation: 'Nuevo Producto', quantity: 10, maxDiscount: 3000 },
        // Última transacción = venta con maxDiscount 0 (legado): no debe ganar.
        { id: 11, operation: 'Venta Producto', quantity: -1, maxDiscount: 0 },
      ],
    };
    component.addProductToSale(sold);
    expect(component.cartItems[0].maxDiscount).toBe(3000);
  });

  it('should cap discount at maxDiscount and recompute finalValue', () => {
    component.addProductToSale(products[0]); // maxDiscount 2000
    component.applyDiscount(0, 99999);
    expect(component.cartItems[0].purchaseDiscount).toBe(2000);
    expect(component.totalSaleValue).toBe(13000);
  });

  it('should recompute totals when removing items and clearing cart', () => {
    component.addProductToSale(products[0]);
    component.addProductToSale(products[1]);
    expect(component.totalSaleValue).toBe(23000);
    component.removeProductFromSale(0);
    expect(component.totalSaleValue).toBe(8000);
    component.clearCart();
    expect(component.cartItems.length).toBe(0);
    expect(component.totalSaleValue).toBe(0);
  });

  it('should NOT send a sale request when the cart is empty', () => {
    salesApiSpy.createSaleBatch.and.returnValue(of({ id: 1, total: 0 } as any));
    component.completeSale();
    expect(salesApiSpy.createSaleBatch).not.toHaveBeenCalled();
  });

  it('should complete the sale through POST /sales/batch and clear the cart', () => {
    salesApiSpy.createSaleBatch.and.returnValue(of({ id: 99, total: 15000 } as any));
    component.addProductToSale(products[0]);
    component.completeSale();

    expect(salesApiSpy.createSaleBatch).toHaveBeenCalledWith({
      products: [
        {
          productId: 1,
          quantity: -1,
          sellingPrice: 15000,
          purchaseDiscount: 0,
          location: 'Sin Datos',
          description: '',
        },
      ],
      total: 15000,
    });

    expect(component.cartItems.length).toBe(0);
    expect(component.totalSaleValue).toBe(0);
    expect(snackbarSpy.success).toHaveBeenCalledWith('Venta realizada correctamente — PDF descargado');
    expect(dataSyncSpy.notifyTransactionUpdate).toHaveBeenCalled();
  });

  it('should auto-download the sale PDF and keep the summary after completing', () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    salesApiSpy.generateSalePdf.and.returnValue(of(blob));
    salesApiSpy.createSaleBatch.and.returnValue(of({ id: 1, total: 15000 } as any));

    component.addProductToSale(products[0]);
    component.completeSale();

    // PDF descargado automáticamente con el resumen de la venta
    expect(salesApiSpy.generateSalePdf).toHaveBeenCalled();
    const payload = salesApiSpy.generateSalePdf.calls.mostRecent().args[0];
    expect(payload.products.length).toBe(1);
    expect(payload.total).toBe(15000);

    // El resumen queda disponible (carrito vacío pero lastSale set)
    expect(component.cartItems.length).toBe(0);
    expect(component.lastSale).not.toBeNull();
    expect(component.hasSummary).toBeTrue();
    expect(component.summaryItems.length).toBe(1);
  });

  it('should clear the last sale summary when starting a new sale', () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    salesApiSpy.generateSalePdf.and.returnValue(of(blob));
    salesApiSpy.createSaleBatch.and.returnValue(of({ id: 1, total: 15000 } as any));

    component.addProductToSale(products[0]);
    component.completeSale();
    expect(component.lastSale).not.toBeNull();

    // Elegir un producto para una venta nueva descarta el resumen anterior
    component.addProductToSale(products[1]);
    expect(component.lastSale).toBeNull();
    expect(component.cartItems.length).toBe(1);
  });

  it('should generate the PDF from the last sale when the cart is empty', () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    salesApiSpy.generateSalePdf.and.returnValue(of(blob));
    salesApiSpy.createSaleBatch.and.returnValue(of({ id: 1, total: 15000 } as any));

    component.addProductToSale(products[0]);
    component.completeSale();
    salesApiSpy.generateSalePdf.calls.reset();

    component.generatePurchasePdf();
    expect(salesApiSpy.generateSalePdf).toHaveBeenCalledTimes(1);
    const payload = salesApiSpy.generateSalePdf.calls.mostRecent().args[0];
    expect(payload.total).toBe(15000);
  });

  it('should show the backend message on 409 (insufficient stock) and keep the cart', () => {
    salesApiSpy.createSaleBatch.and.returnValue(
      throwError(() => ({ error: { message: 'Stock insuficiente para el producto' } }))
    );
    component.addProductToSale(products[0]);
    component.completeSale();

    expect(snackbarSpy.error).toHaveBeenCalledWith('Stock insuficiente para el producto');
    expect(component.cartItems.length).toBe(1); // carrito intacto
    expect(component.submitting).toBeFalse();
  });

  it('should show generic error message when backend has none', () => {
    salesApiSpy.createSaleBatch.and.returnValue(throwError(() => ({ error: {} })));
    component.addProductToSale(products[0]);
    component.completeSale();
    expect(snackbarSpy.error).toHaveBeenCalledWith('Error al realizar la venta');
  });
});
