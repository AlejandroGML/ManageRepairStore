import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { RegisterComponent } from './register.component';
import { ClientsApiService } from 'src/app/services/clients.api.service';
import { OrdersApiService } from 'src/app/services/orders.api.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { LoadingService } from 'src/app/services/loading.service';
import { PdfService } from 'src/app/services/pdf.service';
import { Client } from 'src/app/interface/client';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let clientsApiSpy: jasmine.SpyObj<ClientsApiService>;
  let ordersApiSpy: jasmine.SpyObj<OrdersApiService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;

  const registeredClient = {
    id: 1,
    name: 'Test',
    rut_raw: '12.345.678-5',
    city: 'Test',
    phone: '123',
    address: 'Addr',
    orders: [
      { id: 1, description: '', observation: '', date: new Date(), status: 'Pendiente', code: 'ORD-1234' },
    ],
  } as unknown as Client;

  beforeEach(async () => {
    clientsApiSpy = jasmine.createSpyObj('ClientsApiService', [
      'findUserByRut', 'getUserById', 'getCompanies', 'checkDuplicates',
    ]);
    ordersApiSpy = jasmine.createSpyObj('OrdersApiService', ['create']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['openSnackBar', 'success', 'error']);
    const loadingSpy = jasmine.createSpyObj('LoadingService', ['setLoading']);
    const pdfSpy = jasmine.createSpyObj('PdfService', ['generatePDFServer']);

    clientsApiSpy.getCompanies.and.returnValue(of([
      { name: 'Walmart Chile', rut: '76042014k', sucursales: 9 },
      { name: 'Sodimac S.A.', rut: '96792430k', sucursales: 8 },
    ]));
    clientsApiSpy.checkDuplicates.and.returnValue(of({ count: 0, matches: [] } as any));

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, NoopAnimationsModule],
      providers: [
        { provide: ClientsApiService, useValue: clientsApiSpy },
        { provide: OrdersApiService, useValue: ordersApiSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: LoadingService, useValue: loadingSpy },
        { provide: PdfService, useValue: pdfSpy },
      ],
    }).compileComponents();

    // MatDialogModule provides MatDialog at module level (Material 21),
    // shadowing the root TestBed provider — override at component level.
    TestBed.overrideComponent(RegisterComponent, {
      set: { providers: [{ provide: MatDialog, useValue: dialogSpy }] },
    });

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the form with visible labels (no placeholder-only fields)', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const labels = Array.from(compiled.querySelectorAll('.field-label'));
    const labelTexts = labels.map((l) => l.textContent?.trim());
    expect(labelTexts).toContain('Nombre');
    expect(labelTexts).toContain('RUT');
    expect(labelTexts).toContain('Teléfono');
    expect(labelTexts).toContain('Dirección');
    expect(labelTexts).toContain('Comuna');
    expect(labelTexts).toContain('Descripción');
    expect(labelTexts).toContain('Observaciones');
    expect(compiled.querySelector('#input-client')).toBeTruthy();
  });

  it('should render the order summary panel with PDF action and no QR button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Orden de ingreso');
    expect(compiled.textContent).toContain('PDF');
    // No debe existir un BOTÓN de QR (el QR vive dentro del PDF, no como botón)
    const qrButton = Array.from(compiled.querySelectorAll('button')).find((b) => b.textContent?.includes('QR'));
    expect(qrButton).toBeUndefined();
    const pdfBtn = Array.from(compiled.querySelectorAll('button')).find((b) => b.textContent?.includes('PDF'));
    expect(pdfBtn?.hasAttribute('disabled')).toBeTrue(); // sin orden registrada
  });

  it('should render a "Registrar orden" button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Registrar orden');
  });

  it('should register the order, enable QR/PDF and set the order code from the backend', () => {
    ordersApiSpy.create.and.returnValue(of(registeredClient));
    component.form.get('has_company')?.setValue(true);
    component.form.get('company_name')?.enable();
    component.form.get('company_name')?.setValue('Sucursal Centro');
    component.form.get('name')?.setValue('Test Client');
    component.form.get('rut')?.setValue('12.345.678-5');
    component.form.get('address')?.setValue('Test Address');
    component.form.get('city')?.setValue('Test City');
    component.form.get('phone')?.setValue('123456789');
    component.form.get('description')?.setValue('Test description');
    component.form.get('observation')?.setValue('Test observation');
    component.registerOrder();

    const payload = ordersApiSpy.create.calls.mostRecent().args[0];
    expect(payload.company_name).toBe('Sucursal Centro');
    expect(payload.status).toBe('Pendiente');

    expect(component.enablePDF).toBeTrue();
    expect(component.ordenIngreso.code).toBe('ORD-1234');
    expect(component.ordenIngreso.status).toBe('Pendiente');
    expect(snackbarSpy.success).toHaveBeenCalledWith('Orden registrada correctamente');
  });

  it('should NOT send the order when the form is invalid', () => {
    component.registerOrder();
    expect(ordersApiSpy.create).not.toHaveBeenCalled();
  });

  it('should show a snackbar listing missing fields when the form is invalid', () => {
    component.registerOrder();
    expect(snackbarSpy.openSnackBar).toHaveBeenCalled();
    const msg = snackbarSpy.openSnackBar.calls.mostRecent().args[0] as string;
    expect(msg).toContain('Faltan campos obligatorios');
    expect(msg).toContain('Cliente');
    expect(msg).toContain('RUT');
  });

  it('should empty company_name when has_company is false', () => {
    ordersApiSpy.create.and.returnValue(of(registeredClient));
    component.form.get('name')?.setValue('Test Client');
    component.form.get('rut')?.setValue('12.345.678-5');
    component.form.get('address')?.setValue('Test Address');
    component.form.get('city')?.setValue('Test City');
    component.form.get('phone')?.setValue('123456789');
    component.form.get('description')?.setValue('Test description');
    component.form.get('observation')?.setValue('Test observation');
    component.registerOrder();

    const payload = ordersApiSpy.create.calls.mostRecent().args[0];
    expect(payload.company_name).toBe('');
  });

  it('should open the duplicate modal when matches are found and use the existing client', () => {
    ordersApiSpy.create.and.returnValue(of(registeredClient));
    const matches = [{
      client: { id: 77, name: 'walmar calera', rut_raw: '76042014k', address: 'calera', city: 'calera', phone: '9 1234', email: '', company_name: '' },
      fields: [{ field: 'rut', value: '76042014k', similarity: 1 }],
    }];
    clientsApiSpy.checkDuplicates.and.returnValue(of({ count: 1, matches } as any));
    dialogSpy.open.and.returnValue({ afterClosed: () => of({ action: 'use', client: matches[0].client }) } as any);

    component.form.get('name')?.setValue('walmar calera');
    component.form.get('rut')?.setValue('76042014k');
    component.form.get('address')?.setValue('calera 123');
    component.form.get('city')?.setValue('calera');
    component.form.get('phone')?.setValue('9 1234 5678');
    component.form.get('description')?.setValue('d');
    component.form.get('observation')?.setValue('o');
    component.registerOrder();

    const payload = ordersApiSpy.create.calls.mostRecent().args[0];
    expect(payload.clientId).toBe(77);
    expect(dialogSpy.open).toHaveBeenCalled();
  });

  it('should not submit when the duplicate modal is cancelled', () => {
    clientsApiSpy.checkDuplicates.and.returnValue(of({ count: 1, matches: [{
      client: { id: 1, name: 'x', rut_raw: '1' },
      fields: [{ field: 'name', value: 'x', similarity: 1 }],
    }] } as any));
    dialogSpy.open.and.returnValue({ afterClosed: () => of(undefined) } as any);

    component.form.get('name')?.setValue('x');
    component.form.get('rut')?.setValue('12345678-5');
    component.form.get('address')?.setValue('a');
    component.form.get('city')?.setValue('c');
    component.form.get('phone')?.setValue('9 5555 5555');
    component.form.get('description')?.setValue('d');
    component.form.get('observation')?.setValue('o');
    component.registerOrder();

    expect(ordersApiSpy.create).not.toHaveBeenCalled();
  });

  it('should lock the RUT when selecting an existing company', () => {
    component.hasCompanyChanged(true);
    const event = { option: { value: { name: 'Walmart Chile', rut: '76042014k', sucursales: 9 } } };
    component.onCompanySelected(event as any);

    expect(component.rutLocked).toBeTrue();
    expect(component.form.get('rut')?.value).toBe('76042014k');
    expect(component.form.get('rut')?.disabled).toBeTrue();
  });

  it('should check only non-shared fields when an existing company was chosen (rutLocked)', () => {
    ordersApiSpy.create.and.returnValue(of(registeredClient));
    clientsApiSpy.checkDuplicates.and.returnValue(of({ count: 0, matches: [] } as any));
    component.hasCompanyChanged(true);
    component.onCompanySelected({ option: { value: { name: 'Walmart Chile', rut: '76042014k', sucursales: 9 } } } as any);
    component.form.get('name')?.setValue('Walmart Calera');
    component.form.get('address')?.setValue('Calera 123');
    component.form.get('city')?.setValue('Calera');
    component.form.get('phone')?.setValue('9 1234 5678');
    component.form.get('description')?.setValue('d');
    component.form.get('observation')?.setValue('o');
    component.registerOrder();

    // El chequeo SÍ corre, pero sin RUT ni empresa (compartidos por diseño)
    expect(clientsApiSpy.checkDuplicates).toHaveBeenCalled();
    const input = clientsApiSpy.checkDuplicates.calls.mostRecent().args[0];
    expect(input.rut).toBeUndefined();
    expect(input.company_name).toBeUndefined();
    expect(input.has_company).toBeUndefined();
    expect(input.name).toBe('Walmart Calera');
    expect(input.phone).toBe('9 1234 5678');

    expect(ordersApiSpy.create).toHaveBeenCalled();
    const payload = ordersApiSpy.create.calls.mostRecent().args[0];
    expect(payload.clientId).toBe(0); // sucursal nueva
    expect(payload.rut).toBe('76042014k');
  });

  it('should open the similar-company modal when blurring with a fuzzy name', () => {
    component.hasCompanyChanged(true);
    component.form.get('company_name')?.setValue('Walmert Chile');
    dialogSpy.open.and.returnValue({ afterClosed: () => of({ action: 'create' }) } as any);

    component.onCompanyBlur();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(component.rutLocked).toBeFalse(); // crear nueva: RUT libre
  });

  it('should not open the similar-company modal for an exact registered name', () => {
    component.hasCompanyChanged(true);
    component.form.get('company_name')?.setValue('Walmart Chile');
    component.onCompanyBlur();
    expect(dialogSpy.open).not.toHaveBeenCalled();
  });

  it('should map all 5 OrderStatus values to badges', () => {
    expect(component.orderStatusBadgeClass('Pendiente')).toBe('badge-warning');
    expect(component.orderStatusBadgeClass('En reparacion')).toBe('badge-neutral');
    expect(component.orderStatusBadgeClass('Completado')).toBe('badge-success');
    expect(component.orderStatusBadgeClass('Entregado')).toBe('badge-success');
    expect(component.orderStatusBadgeClass('Cancelado')).toBe('badge-error');
  });

  it('should fill the form when finding a client by RUT', () => {
    clientsApiSpy.findUserByRut.and.returnValue(of([{
      id: 5, name: 'Cliente Rut', rut_raw: '99.999.999-9', email: 'a@b.cl',
      address: 'Dir', city: 'City', phone: '999', company_name: '',
    } as unknown as Client]));
    component.form.get('rut')?.setValue('99.999.999-9');
    component.findByRut();
    expect(component.form.get('name')?.value).toBe('Cliente Rut');
    expect(component.form.get('clientId')?.value).toBe(5);
  });

  it('should open the choice modal when RUT matches multiple clients', () => {
    const clients = [
      { id: 6, name: 'A', rut_raw: '88.888.888-8', address: '', city: '', phone: '' },
      { id: 7, name: 'B', rut_raw: '88.888.888-8', address: '', city: '', phone: '' },
    ] as unknown as Client[];
    clientsApiSpy.findUserByRut.and.returnValue(of(clients));
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);
    component.form.get('rut')?.setValue('88.888.888-8');
    component.findByRut();
    expect(dialogSpy.open).toHaveBeenCalled();
  });

  it('should reset the summary when clearing all data', () => {
    component.ordenIngreso.code = 'ORD-9';
    component.enablePDF = true;
    component.clearAllDataForm();
    expect(component.enablePDF).toBeFalse();
    expect(component.ordenIngreso.code).toBeUndefined();
  });
});
