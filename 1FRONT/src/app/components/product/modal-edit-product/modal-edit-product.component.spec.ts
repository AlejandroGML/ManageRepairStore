import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ModalEditProductComponent } from './modal-edit-product.component';
import { ProductsApiService } from 'src/app/services/products.api.service';

describe('ModalEditProductComponent', () => {
  let component: ModalEditProductComponent;
  let fixture: ComponentFixture<ModalEditProductComponent>;
  let productsApi: jasmine.SpyObj<ProductsApiService>;

  beforeEach(async () => {
    productsApi = jasmine.createSpyObj('ProductsApiService', ['checkProductNameExists', 'createProductTransaction', 'createProduct']);
    await TestBed.configureTestingModule({
      imports: [ ModalEditProductComponent ],
      providers: [
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
        { provide: MAT_DIALOG_DATA, useValue: { product: { id: 1, name: 'Test', transactions: [] } } },
        { provide: ProductsApiService, useValue: productsApi },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalEditProductComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should detect a new product (no id) and create via POST /product', () => {
    component = new ModalEditProductComponent(
      productsApi,
      jasmine.createSpyObj('ModalService', ['open']),
      jasmine.createSpyObj('MatDialogRef', ['close']),
      { product: { name: '', quantity: 0, transactions: [] }, categories: [{ id: 7, name: 'Válvulas' }] }
    );
    expect(component.isNew).toBeTrue();
    expect(component.categories.length).toBe(1);

    component.form.patchValue({
      name: 'Nuevo Producto E2E',
      quantity: 3,
      costPrice: 100,
      sellingPrice: 200,
      location: 'A1',
      minimum: 2,
      categoryId: 7,
    });
    productsApi.createProduct.and.returnValue(of({} as any));
    component.saveChanges();

    expect(productsApi.createProduct).toHaveBeenCalledTimes(1);
    const fd = productsApi.createProduct.calls.mostRecent().args[0] as FormData;
    expect(fd.get('name')).toBe('Nuevo Producto E2E');
    expect(fd.get('categoryId')).toBe('7');
    const tx = JSON.parse(fd.get('transactions') as string);
    expect(tx[0].operation).toBe('Nuevo Producto');
    expect(tx[0].quantity).toBe(3);
    // No usa el endpoint de transacciones para productos nuevos
    expect(productsApi.createProductTransaction).not.toHaveBeenCalled();
  });
});
