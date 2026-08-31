import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ProductRefillModalComponent } from './product-refill-modal.component';
import { ProductsApiService } from 'src/app/services/products.api.service';

describe('ProductRefillModalComponent', () => {
  let component: ProductRefillModalComponent;
  let fixture: ComponentFixture<ProductRefillModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ProductRefillModalComponent ],
      providers: [
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
        { provide: MAT_DIALOG_DATA, useValue: { addedProductIds: [] } },
        { provide: ProductsApiService, useValue: jasmine.createSpyObj('ProductsApiService', ['searchProductById', 'searchProductsByName']) },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductRefillModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
