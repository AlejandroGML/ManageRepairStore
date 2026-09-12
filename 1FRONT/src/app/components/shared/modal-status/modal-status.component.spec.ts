import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ModalStatusComponent } from './modal-status.component';
import { OrdersApiService } from 'src/app/services/orders.api.service';

describe('ModalStatusComponent', () => {
  let component: ModalStatusComponent;
  let fixture: ComponentFixture<ModalStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ModalStatusComponent ],
      providers: [
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
        { provide: MAT_DIALOG_DATA, useValue: { status: 'pending' } },
        { provide: OrdersApiService, useValue: jasmine.createSpyObj('OrdersApiService', ['updateStatus']) },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
