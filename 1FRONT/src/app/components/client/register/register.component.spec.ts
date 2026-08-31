import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
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

  beforeEach(async () => {
    clientsApiSpy = jasmine.createSpyObj('ClientsApiService', [
      'findUserByRut', 'findUserById'
    ]);
    ordersApiSpy = jasmine.createSpyObj('OrdersApiService', ['registerOrder']);
    const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['openSnackBar']);
    const loadingSpy = jasmine.createSpyObj('LoadingService', ['setLoading']);
    const pdfSpy = jasmine.createSpyObj('PdfService', ['generatePDF']);

    await TestBed.configureTestingModule({
      imports: [ RegisterComponent, NoopAnimationsModule ],
      providers: [
        { provide: ClientsApiService, useValue: clientsApiSpy },
        { provide: OrdersApiService, useValue: ordersApiSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: LoadingService, useValue: loadingSpy },
        { provide: PdfService, useValue: pdfSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the form with client ID and name fields', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#input-id-client')).toBeTruthy();
    expect(compiled.querySelector('#input-client')).toBeTruthy();
  });

  it('should render the "Último Ingreso" sidebar section', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Último Ingreso');
  });

  it('should render the Register button in the right panel', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll('button'));
    const registerBtn = buttons.find(btn => btn.textContent?.includes('Registrar'));
    expect(registerBtn).toBeTruthy();
  });

  it('should have a company_name FormControl in the form group', () => {
    expect(component.form.get('company_name')).toBeTruthy();
  });

  it('should render a company_name field with label "Sucursal"', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const labels = Array.from(compiled.querySelectorAll('mat-label'));
    const sucursalLabel = labels.find(l => l.textContent?.trim() === 'Nombre Empresa');
    expect(sucursalLabel).toBeTruthy();
  });

  it('should include company_name in the payload when registering order', () => {
    ordersApiSpy.registerOrder.and.returnValue(of({
      id: 1, name: 'Test', rut_raw: '12.345.678-5', city: 'Test',
      phone: '123', address: 'Addr', code: 100,
      orders: [{ id: 1, description: '', observation: '', date: new Date(), status: 'Pendiente' }]
    } as unknown as Client));

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

    const payload = ordersApiSpy.registerOrder.calls.mostRecent().args[0];
    expect(payload.company_name).toBe('Sucursal Centro');
  });
});
