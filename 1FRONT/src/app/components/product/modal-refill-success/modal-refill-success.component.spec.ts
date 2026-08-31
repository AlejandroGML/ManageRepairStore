import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalRefillSuccessComponent } from './modal-refill-success.component';

describe('ModalRefillSuccessComponent', () => {
  let component: ModalRefillSuccessComponent;
  let fixture: ComponentFixture<ModalRefillSuccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ModalRefillSuccessComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalRefillSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
