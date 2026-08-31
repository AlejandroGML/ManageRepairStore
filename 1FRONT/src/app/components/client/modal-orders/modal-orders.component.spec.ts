import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ModalOrdersComponent } from './modal-orders.component';
import { PdfService } from 'src/app/services/pdf.service';
import { Client } from 'src/app/interface/client';

describe('ModalOrdersComponent', () => {
  let component: ModalOrdersComponent;
  let fixture: ComponentFixture<ModalOrdersComponent>;
  let pdfSpy: jasmine.SpyObj<PdfService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ModalOrdersComponent>>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  const mockClient: Client = {
    id: 1,
    name: 'Test Client',
    rut_raw: '12345678-5',
    address: 'Test Address',
    city: 'Test City',
    phone: '123456789',
    code: 32086,
    email: 'test@test.cl',
    orders: [
      { id: 101, description: 'First order', observation: 'Obs 1', date: new Date(), status: 'Pendiente' }
    ]
  };

  beforeEach(async () => {
    pdfSpy = jasmine.createSpyObj('PdfService', ['generatePDF', 'generatePDFServer']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [ModalOrdersComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockClient },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: PdfService, useValue: pdfSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalOrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize dataSource with client orders', () => {
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].id).toBe(101);
  });

  it('should delegate PDF generation to the backend without a QR payload', () => {
    const orderToDownload = { ...mockClient, id: 101 };
    component.descargarPDF(orderToDownload);

    // QR is generated server-side: the component only forwards the order data
    expect(pdfSpy.generatePDFServer).toHaveBeenCalledWith(component.ordenIngreso);
    expect(pdfSpy.generatePDFServer).toHaveBeenCalledTimes(1);

    expect(component.ordenIngreso.code).toBe(101);
    expect(component.ordenIngreso.description).toBe('First order');
  });

  it('should call dialogRef.close() when close() is invoked', () => {
    component.close();
    expect(dialogRefSpy.close).toHaveBeenCalled();
  });
});
