import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { ModalProductExistsComponent } from './modal-product-exists.component';

describe('ModalProductExistsComponent', () => {
  let component: ModalProductExistsComponent;
  let fixture: ComponentFixture<ModalProductExistsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ModalProductExistsComponent ],
      providers: [
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalProductExistsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
