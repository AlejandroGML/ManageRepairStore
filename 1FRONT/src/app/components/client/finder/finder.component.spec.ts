import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { FinderComponent } from './finder.component';
import { ClientsApiService } from 'src/app/services/clients.api.service';
import { OrdersApiService } from 'src/app/services/orders.api.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { LoadingService } from 'src/app/services/loading.service';
import { Client } from 'src/app/interface/client';

describe('FinderComponent', () => {
  let component: FinderComponent;
  let fixture: ComponentFixture<FinderComponent>;
  let clientsApiSpy: jasmine.SpyObj<ClientsApiService>;
  let ordersApiSpy: jasmine.SpyObj<OrdersApiService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let loadingSpy: jasmine.SpyObj<LoadingService>;

  const mockClient: Client = {
    id: 1,
    name: 'Test Client',
    rut_raw: '12345678-5',
    address: 'Test Address',
    city: 'Test City',
    phone: '123456789',
    code: 32086,
    email: 'test@test.cl',
    company_name: 'Sucursal Norte',
    orders: [{ id: 101, description: 'Test order', observation: '', date: new Date() }]
  };

  beforeEach(async () => {
    clientsApiSpy = jasmine.createSpyObj('ClientsApiService', [
      'findUserById', 'findUserByRut', 'findUserByName',
      'findUserByAddress', 'getAllClients'
    ]);
    ordersApiSpy = jasmine.createSpyObj('OrdersApiService', [
      'findOrderByCode', 'findOrderByUser'
    ]);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['openSnackBar']);
    loadingSpy = jasmine.createSpyObj('LoadingService', ['setLoading']);

    await TestBed.configureTestingModule({
      imports: [FinderComponent, NoopAnimationsModule],
      providers: [
        { provide: ClientsApiService, useValue: clientsApiSpy },
        { provide: OrdersApiService, useValue: ordersApiSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: LoadingService, useValue: loadingSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FinderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('findClientData', () => {
    it('should show snackbar when filterValue is empty', () => {
      component.filterValue = '';
      component.filterSelected = 'id';
      component.findClientData();
      expect(snackbarSpy.openSnackBar).toHaveBeenCalledWith('Es necesario ingresar un valor válido');
    });

    it('should show snackbar when id filter is non-numeric', () => {
      component.filterValue = 'abc';
      component.filterSelected = 'id';
      component.findClientData();
      expect(snackbarSpy.openSnackBar).toHaveBeenCalledWith('Es necesario ingresar un valor válido');
    });

    it('should search by code and populate dataSource on success', () => {
      ordersApiSpy.findOrderByCode.and.returnValue(of(mockClient));

      component.filterValue = '32086';
      component.filterSelected = 'code';
      component.findClientData();

      expect(ordersApiSpy.findOrderByCode).toHaveBeenCalledWith('32086');
      expect(component.dataSource.data.length).toBe(1);
    });

    it('should search by id and populate table on success', () => {
      clientsApiSpy.findUserById.and.returnValue(of(mockClient));

      component.filterValue = '1';
      component.filterSelected = 'id';
      component.findClientData();

      expect(clientsApiSpy.findUserById).toHaveBeenCalledWith(1);
      expect(component.dataSource.data.length).toBe(1);
      expect(component.dataSource.data[0].name).toBe('Test Client');
    });

    it('should search by rut and populate table on success', () => {
      clientsApiSpy.findUserByRut.and.returnValue(of([mockClient]));

      component.filterValue = '12.345.678-5';
      component.filterSelected = 'rut';
      component.findClientData();

      expect(clientsApiSpy.findUserByRut).toHaveBeenCalledWith('123456785');
      expect(component.dataSource.data.length).toBe(1);
    });

    it('should search by name and populate table on success', () => {
      clientsApiSpy.findUserByName.and.returnValue(of([mockClient]));

      component.filterValue = 'Test';
      component.filterSelected = 'name';
      component.findClientData();

      expect(clientsApiSpy.findUserByName).toHaveBeenCalledWith('Test');
      expect(component.dataSource.data.length).toBe(1);
    });

    it('should show snackbar on findOrderByCode error', () => {
      ordersApiSpy.findOrderByCode.and.returnValue(throwError(() => new Error('API error')));

      component.filterValue = '32086';
      component.filterSelected = 'code';
      component.findClientData();

      expect(snackbarSpy.openSnackBar).toHaveBeenCalledWith('Error al buscar. Intente nuevamente.');
      expect(loadingSpy.setLoading).toHaveBeenCalledWith(false);
    });

    it('should show snackbar on findUserById error', () => {
      clientsApiSpy.findUserById.and.returnValue(throwError(() => new Error('API error')));

      component.filterValue = '1';
      component.filterSelected = 'id';
      component.findClientData();

      expect(snackbarSpy.openSnackBar).toHaveBeenCalledWith('Error al buscar. Intente nuevamente.');
      expect(loadingSpy.setLoading).toHaveBeenCalledWith(false);
    });

    it('should show snackbar on findUserByRut error', () => {
      clientsApiSpy.findUserByRut.and.returnValue(throwError(() => new Error('API error')));

      component.filterValue = '12.345.678-5';
      component.filterSelected = 'rut';
      component.findClientData();

      expect(snackbarSpy.openSnackBar).toHaveBeenCalledWith('Error al buscar. Intente nuevamente.');
      expect(loadingSpy.setLoading).toHaveBeenCalledWith(false);
    });

    it('should show snackbar on findUserByName error', () => {
      clientsApiSpy.findUserByName.and.returnValue(throwError(() => new Error('API error')));

      component.filterValue = 'Test';
      component.filterSelected = 'name';
      component.findClientData();

      expect(snackbarSpy.openSnackBar).toHaveBeenCalledWith('Error al buscar. Intente nuevamente.');
      expect(loadingSpy.setLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('showModalEditUser', () => {
    it('should NOT mutate client.orders when opening edit modal', () => {
      const clientWithOrders: Client = {
        ...mockClient,
        orders: [{ id: 101, description: 'Test', observation: '', date: new Date() }]
      };

      component.showModalEditUser(clientWithOrders);

      expect(clientWithOrders.orders).toBeDefined();
      expect(clientWithOrders.orders!.length).toBe(1);
    });
  });

  describe('showOrderDetails', () => {
    it('should show snackbar on findOrderByUser error', () => {
      ordersApiSpy.findOrderByUser.and.returnValue(throwError(() => new Error('API error')));

      component.showOrderDetails(mockClient);

      expect(snackbarSpy.openSnackBar).toHaveBeenCalledWith('Error al buscar. Intente nuevamente.');
      expect(loadingSpy.setLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('table responsive wrapper', () => {
    it('should render a table when data is loaded', () => {
      clientsApiSpy.findUserById.and.returnValue(of(mockClient));
      component.filterValue = '1';
      component.filterSelected = 'id';
      component.findClientData();
      fixture.detectChanges();
      const table = fixture.nativeElement.querySelector('table');
      expect(table).toBeTruthy();
    });
  });

  describe('dead code removal', () => {
    it('should not have checkCacheData method', () => {
      expect((component as any).checkCacheData).toBeUndefined();
    });

    it('should not have updatingUsers property', () => {
      expect((component as any).updatingUsers).toBeUndefined();
    });

    it('should not have findClientEvent output', () => {
      expect((component as any).findClientEvent).toBeUndefined();
    });
  });

  describe('company_name column', () => {
    it('should include company_name in displayedColumns', () => {
      expect(component.displayedColumns).toContain('company_name');
    });
  });
});
