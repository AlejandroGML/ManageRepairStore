import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { ProductComponent } from './product.component';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { CategoriesApiService } from 'src/app/services/categories.api.service';
import { DataSyncService } from 'src/app/services/data-sync.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { Product } from 'src/app/interface/warehouse';

describe('ProductComponent (server-driven catalog)', () => {
  let component: ProductComponent;
  let fixture: ComponentFixture<ProductComponent>;
  let productsApiSpy: jasmine.SpyObj<ProductsApiService>;
  let categoriesApiSpy: jasmine.SpyObj<CategoriesApiService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let dataSyncSpy: jasmine.SpyObj<DataSyncService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;

  /** Página server-side: ids 5..24 (orden id DESC), total 24. */
  function buildPage(): { items: Product[]; total: number } {
    const items: Product[] = [];
    for (let i = 24; i >= 5; i--) {
      items.push({
        id: i,
        name: `Producto ${i}`,
        quantity: 0,
        stock: i <= 8 ? 1 : i <= 16 ? 4 : 10,
        minimum: 5,
        costPrice: 1000 * i,
        sellingPrice: 2000 * i,
        location: `A-0${i}`,
        transactions: [],
        category: { id: i <= 12 ? 1 : 2, name: i <= 12 ? 'Lubricantes' : 'Filtros' } as any,
      });
    }
    return { items, total: 24 };
  }

  beforeEach(async () => {
    productsApiSpy = jasmine.createSpyObj('ProductsApiService', [
      'searchProducts', 'countActive', 'getProductTransactions', 'softDeleteProduct',
    ]);
    productsApiSpy.searchProducts.and.returnValue(of(buildPage()));
    productsApiSpy.countActive.and.returnValue(of(24));
    categoriesApiSpy = jasmine.createSpyObj('CategoriesApiService', ['getCategories']);
    categoriesApiSpy.getCategories.and.returnValue(of([
      { id: 1, name: 'Lubricantes' },
      { id: 2, name: 'Filtros' },
    ] as any));
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    dataSyncSpy = jasmine.createSpyObj('DataSyncService', ['notifyTransactionUpdate']);
    dataSyncSpy.transactionUpdated$ = of();
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['success', 'error', 'openSnackBar']);

    await TestBed.configureTestingModule({
      imports: [ProductComponent, NoopAnimationsModule],
      providers: [
        { provide: ProductsApiService, useValue: productsApiSpy },
        { provide: CategoriesApiService, useValue: categoriesApiSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: DataSyncService, useValue: dataSyncSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
      ],
    }).compileComponents();

    // MatDialogModule provides MatDialog at module level (Material 21),
    // shadowing the root TestBed provider — override at component level.
    TestBed.overrideComponent(ProductComponent, {
      set: { providers: [{ provide: MatDialog, useValue: dialogSpy }] },
    });

    fixture = TestBed.createComponent(ProductComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load the first page server-side (20 rows max) and the catalog total', () => {
    expect(productsApiSpy.searchProducts).toHaveBeenCalledWith('', 'name', 20, 0, 'all', 'all');
    expect(productsApiSpy.countActive).toHaveBeenCalled();
    expect(component.pageItems.length).toBe(20);
    expect(component.filteredCount).toBe(24);
    expect(component.totalProducts).toBe(24);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Producto 5');
    expect(compiled.textContent).toContain('Lubricantes');
  });

  it('should populate the category dropdown from the categories API', () => {
    expect(component.categoryNames).toEqual(['Lubricantes', 'Filtros']);
    const compiled = fixture.nativeElement as HTMLElement;
    const options = Array.from(compiled.querySelectorAll('select option'));
    expect(options.map((o) => o.textContent?.trim())).toContain('Filtros');
    expect(options.map((o) => o.textContent?.trim())).toContain('Lubricantes');
  });

  it('should send the category filter to the server and reset to page 0', () => {
    productsApiSpy.searchProducts.calls.reset();
    component.categoryFilter = 'Lubricantes';
    component.onCategoryChange();
    expect(productsApiSpy.searchProducts).toHaveBeenCalledWith('', 'name', 20, 0, 'Lubricantes', 'all');
  });

  it('should send the stock chips to the server', () => {
    productsApiSpy.searchProducts.calls.reset();
    component.setStockFilter('stock');
    expect(productsApiSpy.searchProducts).toHaveBeenCalledWith('', 'name', 20, 0, 'all', 'stock');
    component.setStockFilter('low');
    expect(productsApiSpy.searchProducts).toHaveBeenCalledWith('', 'name', 20, 0, 'all', 'low');
  });

  it('should search server-side with debounce', fakeAsync(() => {
    productsApiSpy.searchProducts.calls.reset();
    component.searchQuery = 'giacomini';
    component.onSearchChange();
    tick(250);
    expect(productsApiSpy.searchProducts).toHaveBeenCalledWith('giacomini', 'name', 20, 0, 'all', 'all');
  }));

  it('should badge stock: 1 → Crítico, 4 → Bajo, 10 → En stock', () => {
    expect(component.stockBadgeLabel(1)).toBe('Crítico');
    expect(component.stockBadgeClass(1)).toBe('badge-error');
    expect(component.stockBadgeLabel(4)).toBe('Bajo');
    expect(component.stockBadgeClass(4)).toBe('badge-warning');
    expect(component.stockBadgeLabel(10)).toBe('En stock');
    expect(component.stockBadgeClass(10)).toBe('badge-success');
  });

  it('should paginate server-side: 24 products, page size 20 → 2 pages', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.pageItems.length).toBe(20);
    expect(component.pageCount).toBe(2);
    expect(compiled.textContent).toContain('Mostrando 1-20 de 24');

    component.goPage(1);
    fixture.detectChanges();
    expect(productsApiSpy.searchProducts).toHaveBeenCalledWith('', 'name', 20, 20, 'all', 'all');
    expect(component.pageIndex).toBe(1);
    expect(compiled.textContent).toContain('Mostrando 21-24 de 24');
  });

  it('should show empty state when the server matches nothing', () => {
    productsApiSpy.searchProducts.and.returnValue(of({ items: [], total: 0 }));
    component.categoryFilter = 'Inexistente';
    component.onCategoryChange();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.filteredCount).toBe(0);
    expect(compiled.textContent).toContain('Sin productos que coincidan');
    expect(compiled.textContent).toContain('Mostrando 0-0 de 0');
  });

  it('should show product code P-001 style', () => {
    expect(component.productCode({ id: 7, name: 'x', quantity: 0, transactions: [] })).toBe('P-007');
  });

  it('should open add/edit/delete dialogs', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);
    component.openAddProductModal();
    expect(dialogSpy.open).toHaveBeenCalled();
    const product = buildPage().items[0];
    component.openEditProductModal(product);
    expect(dialogSpy.open).toHaveBeenCalled();
    component.openDeleteProductModal(product);
    expect(dialogSpy.open).toHaveBeenCalled();
  });

  it('should reload products when transaction update is notified', () => {
    expect(productsApiSpy.searchProducts.calls.count()).toBe(1);
    component.ngOnInit();
    expect(productsApiSpy.searchProducts.calls.count()).toBe(2);
  });
});
