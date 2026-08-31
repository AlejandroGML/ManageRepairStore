import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';

import { ModalSearchResultsComponent } from './modal-search-results.component';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { DataSyncService } from 'src/app/services/data-sync.service';

describe('ModalSearchResultsComponent', () => {
  let component: ModalSearchResultsComponent;
  let fixture: ComponentFixture<ModalSearchResultsComponent>;

  beforeEach(async () => {
    const dataSyncSpy = jasmine.createSpyObj('DataSyncService', ['notifyTransactionUpdate']);
    dataSyncSpy.transactionUpdated$ = of();

    await TestBed.configureTestingModule({
      imports: [ ModalSearchResultsComponent ],
      providers: [
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
        { provide: MAT_DIALOG_DATA, useValue: { products: [] } },
        { provide: ProductsApiService, useValue: jasmine.createSpyObj('ProductsApiService', ['getProductTransactions']) },
        { provide: DataSyncService, useValue: dataSyncSpy },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalSearchResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
