import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ModalViewTransactionsComponent } from './modal-view-transactions.component';

describe('ModalViewTransactionsComponent', () => {
  let component: ModalViewTransactionsComponent;
  let fixture: ComponentFixture<ModalViewTransactionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ModalViewTransactionsComponent ],
      providers: [
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
        { provide: MAT_DIALOG_DATA, useValue: { product: {}, transactions: [] } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalViewTransactionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
