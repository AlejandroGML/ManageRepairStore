import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { RegisterComponent } from './register.component';
import { ClientsApiService } from 'src/app/services/clients.api.service';
import { CompaniesApiService, CompanyRow } from 'src/app/services/companies.api.service';
import { OrdersApiService } from 'src/app/services/orders.api.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { LoadingService } from 'src/app/services/loading.service';
import { PdfService } from 'src/app/services/pdf.service';
import { Client } from 'src/app/interface/client';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let clientsApiSpy: jasmine.SpyObj<ClientsApiService>;
  let companiesApiSpy: jasmine.SpyObj<CompaniesApiService>;
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

  const companyHit: CompanyRow = {
    id: 5906,
    name: 'sodimac',
    rutNormalizado: '96792430-K',
    branchCount: 8,
  };

  const branchClient = {
    id: 77,
    name: 'sodimac la calera',
    rut_raw: '96792430-K',
    address: 'calera 123',
    city: 'La Calera',
    phone: '9 1111 2222',
    email: 'calera@sodimac.cl',
    company_id: 5906,
  } as unknown as Client;

  beforeEach(async () => {
    clientsApiSpy = jasmine.createSpyObj('ClientsApiService', [
      'findUserByRut', 'getUserById', 'checkDuplicates', 'searchClients',
    ]);
    companiesApiSpy = jasmine.createSpyObj('CompaniesApiService', [
      'search', 'list', 'rename', 'clients',
    ]);
    ordersApiSpy = jasmine.createSpyObj('OrdersApiService', ['create']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['openSnackBar', 'success', 'error']);
    const loadingSpy = jasmine.createSpyObj('LoadingService', ['setLoading']);
    const pdfSpy = jasmine.createSpyObj('PdfService', ['generatePDFServer']);

    clientsApiSpy.checkDuplicates.and.returnValue(of({ count: 0, matches: [] } as any));
    clientsApiSpy.searchClients.and.returnValue(of({ items: [], total: 0 } as any));
    companiesApiSpy.search.and.returnValue(of({ items: [], total: 0, page: 1, limit: 8 } as any));
    companiesApiSpy.clients.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, NoopAnimationsModule],
      providers: [
        { provide: ClientsApiService, useValue: clientsApiSpy },
        { provide: CompaniesApiService, useValue: companiesApiSpy },
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
    expect(labelTexts).toContain('Dirección');
    expect(labelTexts).toContain('Teléfono');
    expect(labelTexts).toContain('Correo');
    expect(labelTexts).toContain('Comuna');
    expect(labelTexts).toContain('Descripción');
    expect(labelTexts).toContain('Observaciones');
  });

  it('should render the order summary panel with PDF action and no QR button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const qrButton = Array.from(compiled.querySelectorAll('button')).find((b) => b.textContent?.includes('QR'));
    expect(qrButton).toBeUndefined();
    const pdfBtn = Array.from(compiled.querySelectorAll('button')).find((b) => b.textContent?.includes('PDF'));
    expect(pdfBtn?.hasAttribute('disabled')).toBe(true); // sin orden registrada
  });

  it('should render a "Registrar orden" button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Registrar orden');
  });

  it('should hide the "Registra la orden" hint once the order is registered', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const hint = () =>
      Array.from(compiled.querySelectorAll('.summary-hint')).find((el) =>
        el.textContent?.includes('Registra la orden')
      );
    expect(hint()).toBeDefined();

    component.enablePDF = true;
    fixture.detectChanges();
    expect(hint()).toBeUndefined();
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
    expect(payload.is_company).toBe(true);
    expect(payload.status).toBe('Pendiente');

    expect(component.enablePDF).toBe(true);
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

  it('should empty company_name and companyId when has_company is false', () => {
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
    expect(payload.companyId).toBeNull();
    expect(payload.is_company).toBe(false);
  });

  it('should open the duplicate modal when matches are found and use the existing client', () => {
    ordersApiSpy.create.and.returnValue(of(registeredClient));
    const matches = [{
      client: { id: 77, name: 'walmar calera', rut_raw: '76042014k', address: 'calera', city: 'calera', phone: '9 1234', email: '' },
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

  // ─── Flujo de empresa (Opción A: autocomplete real + sucursales) ────────

  it('should search companies through the real endpoint (debounced)', fakeAsync(() => {
    companiesApiSpy.search.and.returnValue(of({ items: [companyHit], total: 1, page: 1, limit: 8 } as any));
    component.hasCompanyChanged(true);
    component.form.get('company_name')?.setValue('sodimac');
    component.onCompanyInput();
    tick(250);

    expect(companiesApiSpy.search).toHaveBeenCalledWith('sodimac', 8);
    expect(component.companyResults.length).toBe(1);
  }));

  it('should lock the RUT, set companyId and load branches when selecting a company', () => {
    companiesApiSpy.clients.and.returnValue(of([branchClient]));
    component.hasCompanyChanged(true);
    component.onCompanySelected({ option: { value: companyHit } } as any);

    expect(component.form.get('rut')?.value).toBe('96792430-K');
    expect(component.form.get('rut')?.disabled).toBe(true);
    expect(component.rutLocked).toBe(true);
    expect(component.form.get('companyId')?.value).toBe(5906);
    expect(companiesApiSpy.clients).toHaveBeenCalledWith(5906);
    expect(component.branches.length).toBe(1);
  });

  it('should reuse a branch: fills the form and keeps the company + locked RUT', () => {
    companiesApiSpy.clients.and.returnValue(of([branchClient]));
    component.hasCompanyChanged(true);
    component.onCompanySelected({ option: { value: companyHit } } as any);

    component.selectBranch(branchClient);

    expect(component.form.get('clientId')?.value).toBe(77);
    expect(component.form.get('name')?.value).toBe('sodimac la calera');
    expect(component.form.get('city')?.value).toBe('La Calera');
    expect(component.form.get('rut')?.disabled).toBe(true);
    expect(component.rutLocked).toBe(true);
    expect(component.form.get('companyId')?.value).toBe(5906);
  });

  it('should clear the client fields on "nueva sucursal" keeping the company', () => {
    component.hasCompanyChanged(true);
    component.onCompanySelected({ option: { value: companyHit } } as any);
    component.selectBranch(branchClient);

    component.nuevaSucursal();

    expect(component.form.get('name')?.value).toBe('');
    expect(component.form.get('clientId')?.value).toBe('');
    expect(component.form.get('rut')?.disabled).toBe(true);
    expect(component.form.get('companyId')?.value).toBe(5906);
  });

  it('should clear the company state when the toggle turns off', () => {
    component.hasCompanyChanged(true);
    component.onCompanySelected({ option: { value: companyHit } } as any);

    component.hasCompanyChanged(false);

    expect(component.form.get('companyId')?.value).toBeNull();
    expect(component.form.get('company_name')?.value).toBe('');
    expect(component.branches).toEqual([]);
    expect(component.rutLocked).toBe(false);
    expect(component.form.get('rut')?.disabled).toBe(false);
    // El RUT de la empresa también se limpia (JD A3/B1: link silencioso).
    expect(component.form.get('rut')?.value).toBe('');
  });

  it('should open the manage-companies modal and refresh the selected company name', () => {
    dialogSpy.open.and.returnValue({
      afterClosed: () => of([{ id: 5906, name: 'Sodimac Chile' }]),
    } as any);
    component.hasCompanyChanged(true);
    component.onCompanySelected({ option: { value: companyHit } } as any);

    component.openManageCompanies();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(component.selectedCompany?.name).toBe('Sodimac Chile');
    // El control guarda el objeto: el displayWith del autocomplete lo muestra.
    const controlValue = component.form.get('company_name')?.value as any;
    expect(component.companyDisplay(controlValue)).toBe('Sodimac Chile');
  });

  it('should always render the manage-companies button (decision D)', () => {
    fixture.detectChanges();
    // Toggle apagado: el botón de GESTIÓN igual está visible.
    expect(fixture.nativeElement.querySelector('.manage-companies-btn')).not.toBeNull();

    component.hasCompanyChanged(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.manage-companies-btn')).not.toBeNull();
  });

  it('should send companyId in the duplicate check when a company is selected', () => {
    ordersApiSpy.create.and.returnValue(of(registeredClient));
    clientsApiSpy.checkDuplicates.and.returnValue(of({ count: 0, matches: [] } as any));
    component.hasCompanyChanged(true);
    component.onCompanySelected({ option: { value: companyHit } } as any);
    component.form.get('name')?.setValue('sodimac nueva sucursal');
    component.form.get('address')?.setValue('x 123');
    component.form.get('city')?.setValue('La Calera');
    component.form.get('phone')?.setValue('9 1111 1111');
    component.form.get('description')?.setValue('d');
    component.form.get('observation')?.setValue('o');
    component.registerOrder();

    const input = clientsApiSpy.checkDuplicates.calls.mostRecent().args[0];
    expect(input.companyId).toBe(5906);
    expect(input.rut).toBe('96792430-K');
    expect(ordersApiSpy.create).toHaveBeenCalled();
  });

  // ─── Búsqueda de clientes (panel superior: campo + filtro) ─────────────

  const searchHit = {
    id: 42,
    name: 'Comercial Toledo SpA',
    rut_raw: '76543210k',
    address: 'Av. Providencia 1234',
    city: 'Santiago',
    phone: '9 5555 1111',
    email: 'contacto@toledo.cl',
    orderCount: 3,
  } as unknown as Client & { orderCount: number };

  it('should search clients by name (debounced) and autofill the form on selection', fakeAsync(() => {
    clientsApiSpy.searchClients.and.returnValue(of({ items: [searchHit], total: 1 } as any));

    component.searchQuery.setValue('Toledo');
    component.onSearchInput();
    tick(250);

    expect(clientsApiSpy.searchClients).toHaveBeenCalledWith('Toledo', 'name', 8);
    expect(component.searchResults.length).toBe(1);

    component.selectSearchResult(searchHit);

    expect(component.form.get('name')?.value).toBe('Comercial Toledo SpA');
    expect(component.form.get('clientId')?.value).toBe(42);
    expect(component.form.get('rut')?.value).toBe('76543210k');
    expect(component.form.get('address')?.value).toBe('Av. Providencia 1234');
    expect(component.form.get('city')?.value).toBe('Santiago');
    expect(component.form.get('phone')?.value).toBe('9 5555 1111');
  }));

  it('should switch the search filter to RUT and search with it', fakeAsync(() => {
    clientsApiSpy.searchClients.and.returnValue(of({ items: [searchHit], total: 1 } as any));

    component.searchQuery.setValue('76543210');
    component.onSearchFieldChange('rut');
    tick(250);

    expect(component.searchField).toBe('rut');
    expect(clientsApiSpy.searchClients).toHaveBeenCalledWith('76543210', 'rut', 8);
  }));

  it('should clear filters and results after selecting a client', fakeAsync(() => {
    clientsApiSpy.searchClients.and.returnValue(of({ items: [searchHit], total: 1 } as any));
    component.searchQuery.setValue('Toledo');
    component.onSearchInput();
    tick(250);

    component.selectSearchResult(searchHit);

    expect(component.searchQuery.value).toBe('');
    expect(component.searchResults).toEqual([]);
    expect(component.searchAttempted).toBeFalse();
  }));

  it('should not search with less than 2 characters', fakeAsync(() => {
    component.searchQuery.setValue('T');
    component.onSearchInput();
    tick(250);

    expect(clientsApiSpy.searchClients).not.toHaveBeenCalled();
    expect(component.searchResults).toEqual([]);
  }));

  it('should render results with formatted RUT and hide garbage RUTs', () => {
    component.searchResults = [
      searchHit,
      { ...searchHit, id: 43, name: 'Sin RUT', rut_raw: '0' },
    ];
    component.searchAttempted = true;
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.client-search-item');
    expect(items.length).toBe(2);
    expect(items[0].querySelector('.cs-rut')?.textContent?.trim()).toBe('76.543.210-K');
    // RUT basura ('0') no se muestra; el resto de la meta sigue visible
    expect(items[1].querySelector('.cs-rut')).toBeNull();
    expect(items[1].textContent).toContain('Santiago');
  });

  it('should flag meaningful RUTs only', () => {
    expect(component.hasMeaningfulRut('76.543.210-K')).toBeTrue();
    expect(component.hasMeaningfulRut('0')).toBeFalse();
    expect(component.hasMeaningfulRut('')).toBeFalse();
    expect(component.hasMeaningfulRut('00000000')).toBeFalse();
  });

  it('should include the selected clientId in the duplicate check', () => {
    ordersApiSpy.create.and.returnValue(of(registeredClient));
    clientsApiSpy.checkDuplicates.and.returnValue(of({ count: 0, matches: [] } as any));

    component.selectSearchResult(searchHit);
    component.form.get('description')?.setValue('d');
    component.form.get('observation')?.setValue('o');
    component.registerOrder();

    const input = clientsApiSpy.checkDuplicates.calls.mostRecent().args[0];
    expect(input.clientId).toBe(42);
    expect(ordersApiSpy.create).toHaveBeenCalled();
  });

  it('should load sibling branches when a company client is reused (search/RUT)', () => {
    companiesApiSpy.clients.and.returnValue(of([branchClient]));
    const companyClient = {
      ...searchHit,
      id: 99,
      company_id: 5906,
      company: { id: 5906, name: 'sodimac', rut_normalizado: '96792430-K' },
    } as unknown as Client & { orderCount: number };

    component.selectSearchResult(companyClient);

    expect(companiesApiSpy.clients).toHaveBeenCalledWith(5906);
    expect(component.branches.length).toBe(1);
    expect(component.form.get('companyId')?.value).toBe(5906);
    // S2: RUT bloqueado (la sucursal comparte el de su empresa) + empresa
    // reconstruida para el renombre.
    expect(component.rutLocked).toBeTrue();
    expect(component.form.get('rut')?.disabled).toBeTrue();
    expect(component.selectedCompany?.id).toBe(5906);
  });

  it('should surface the server error message when registering fails (S1)', () => {
    const serverMessage = 'El RUT del cliente (12.345.678-5) no calza con el de la empresa #12 (96792430k)';
    ordersApiSpy.create.and.returnValue(
      throwError(() => ({ error: { statusCode: 400, message: serverMessage } })),
    );

    component.form.get('name')?.setValue('Test Client');
    component.form.get('rut')?.setValue('12.345.678-5');
    component.form.get('address')?.setValue('Test Address');
    component.form.get('city')?.setValue('Test City');
    component.form.get('phone')?.setValue('123456789');
    component.form.get('description')?.setValue('Test description');
    component.form.get('observation')?.setValue('Test observation');
    component.registerOrder();

    expect(snackbarSpy.openSnackBar).toHaveBeenCalledWith(serverMessage);
  });

  // ─── Búsqueda legacy por RUT (funciones conservadas) ────────────────────

  it('should fill the form when finding a client by RUT', () => {
    clientsApiSpy.findUserByRut.and.returnValue(of([{
      id: 5, name: 'Cliente Rut', rut_raw: '99.999.999-9', email: 'a@b.cl',
      address: 'Dir', city: 'City', phone: '999',
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
