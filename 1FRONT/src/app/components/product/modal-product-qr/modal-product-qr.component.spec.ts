import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ModalProductQrComponent } from './modal-product-qr.component';
import { QrService } from 'src/app/services/qr.service';

describe('ModalProductQrComponent', () => {
  let component: ModalProductQrComponent;
  let fixture: ComponentFixture<ModalProductQrComponent>;
  let qrServiceSpy: jasmine.SpyObj<QrService>;

  const product = { id: 42, name: 'Presostato SPLENDID' } as any;

  beforeEach(async () => {
    qrServiceSpy = jasmine.createSpyObj('QrService', ['toCanvas', 'toDataURL']);
    qrServiceSpy.toCanvas.and.returnValue(Promise.resolve(document.createElement('canvas')));
    qrServiceSpy.toDataURL.and.returnValue(Promise.resolve('data:image/png;base64,xx'));

    await TestBed.configureTestingModule({
      imports: [ModalProductQrComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
        { provide: MAT_DIALOG_DATA, useValue: { product } },
        { provide: QrService, useValue: qrServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalProductQrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should encode ABAGAS|PROD|{id}|{name} as QR data', () => {
    expect(component.qrData).toBe('ABAGAS|PROD|42|Presostato SPLENDID');
  });

  it('should render the QR canvas on init', async () => {
    await fixture.whenStable();
    expect(qrServiceSpy.toCanvas).toHaveBeenCalledWith('ABAGAS|PROD|42|Presostato SPLENDID', 240);
    expect(component.qrHost.nativeElement.querySelector('canvas')).toBeTruthy();
  });

  it('should download a PNG with the product id in the filename', async () => {
    const clickSpy = spyOn(HTMLAnchorElement.prototype, 'click');
    component.download();
    await fixture.whenStable();
    expect(qrServiceSpy.toDataURL).toHaveBeenCalledWith('ABAGAS|PROD|42|Presostato SPLENDID', 480);
    expect(clickSpy).toHaveBeenCalled();
  });
});