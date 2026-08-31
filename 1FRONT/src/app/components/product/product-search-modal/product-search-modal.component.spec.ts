import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ProductSearchModalComponent } from './product-search-modal.component';
import { ProductsApiService } from 'src/app/services/products.api.service';

describe('ProductSearchModalComponent', () => {
  let component: ProductSearchModalComponent;
  let fixture: ComponentFixture<ProductSearchModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ProductSearchModalComponent ],
      providers: [
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
        { provide: MAT_DIALOG_DATA, useValue: { addedProductIds: [] } },
        { provide: ProductsApiService, useValue: jasmine.createSpyObj('ProductsApiService', ['searchProductById', 'searchProductsByName']) },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductSearchModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
