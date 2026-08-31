import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ModalEditProductComponent } from './modal-edit-product.component';
import { ProductsApiService } from 'src/app/services/products.api.service';

describe('ModalEditProductComponent', () => {
  let component: ModalEditProductComponent;
  let fixture: ComponentFixture<ModalEditProductComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ModalEditProductComponent ],
      providers: [
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
        { provide: MAT_DIALOG_DATA, useValue: { product: { id: 1, name: 'Test', transactions: [] } } },
        { provide: ProductsApiService, useValue: jasmine.createSpyObj('ProductsApiService', ['checkProductNameExists', 'createProductTransaction']) },
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
});
