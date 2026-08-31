import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { ProductComponent } from './product.component';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { DataSyncService } from 'src/app/services/data-sync.service';

describe('ProductComponent', () => {
  let component: ProductComponent;
  let fixture: ComponentFixture<ProductComponent>;

  beforeEach(async () => {
    const productsApiSpy = jasmine.createSpyObj('ProductsApiService', [
      'getProductsWithLastTransaction', 'createProduct',
      'searchProductById', 'searchProductsByName', 'searchProductsByLocation',
      'getProductTransactions'
    ]);
    productsApiSpy.getProductsWithLastTransaction.and.returnValue(of([]));
    const dataSyncSpy = jasmine.createSpyObj('DataSyncService', ['notifyTransactionUpdate']);
    dataSyncSpy.transactionUpdated$ = of();

    await TestBed.configureTestingModule({
      imports: [ ProductComponent, NoopAnimationsModule ],
      providers: [
        { provide: ProductsApiService, useValue: productsApiSpy },
        { provide: DataSyncService, useValue: dataSyncSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render product form fields', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Nombre de Producto');
    expect(compiled.textContent).toContain('Stock Inicial');
    expect(compiled.textContent).toContain('Precio de Costo');
  });

  it('should render the product table', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const table = compiled.querySelector('table');
    expect(table).toBeTruthy();
  });
});
