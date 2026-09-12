import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ModalProductSearchComponent } from './modal-product-search.component';
import { ProductsApiService } from 'src/app/services/products.api.service';

describe('ModalProductSearchComponent', () => {
  let component: ModalProductSearchComponent;
  let fixture: ComponentFixture<ModalProductSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ModalProductSearchComponent ],
      providers: [
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
        { provide: MAT_DIALOG_DATA, useValue: { addedProductIds: [] } },
        { provide: ProductsApiService, useValue: jasmine.createSpyObj('ProductsApiService', ['searchProductById', 'searchProductsByName']) },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalProductSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
