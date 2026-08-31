import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { RefillsComponent } from './refills.component';
import { AdminApiService } from 'src/app/services/admin.api.service';
import { SalesApiService } from 'src/app/services/sales.api.service';
import { DataSyncService } from 'src/app/services/data-sync.service';

describe('RefillsComponent', () => {
  let component: RefillsComponent;
  let fixture: ComponentFixture<RefillsComponent>;
  let adminApiSpy: jasmine.SpyObj<AdminApiService>;
  let salesApiSpy: jasmine.SpyObj<SalesApiService>;
  let dataSyncSpy: jasmine.SpyObj<DataSyncService>;

  beforeEach(async () => {
    adminApiSpy = jasmine.createSpyObj('AdminApiService', [
      'getActiveUsers',
      'getAllOrders',
    ]);
    salesApiSpy = jasmine.createSpyObj('SalesApiService', ['createRefillBatch']);
    salesApiSpy.createRefillBatch.and.returnValue(of({ id: 1, totalValue: 0 }));
    adminApiSpy.getActiveUsers.and.returnValue(of([{ id: 1, name: 'Técnico 1' }, { id: 2, name: 'Técnico 2' }]));
    adminApiSpy.getAllOrders.and.returnValue(of([{ id: 10, description: 'Orden 1', orders: [{ id: 100, status: 'open' }] }]));

    dataSyncSpy = jasmine.createSpyObj('DataSyncService', ['notifyTransactionUpdate']);
    dataSyncSpy.transactionUpdated$ = of();

    await TestBed.configureTestingModule({
      imports: [ RefillsComponent, NoopAnimationsModule ],
      providers: [
        { provide: AdminApiService, useValue: adminApiSpy },
        { provide: SalesApiService, useValue: salesApiSpy },
        { provide: DataSyncService, useValue: dataSyncSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RefillsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the refill table', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const table = compiled.querySelector('table');
    expect(table).toBeTruthy();
  });

  it('should render "Buscar Producto" button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll('button'));
    const searchBtn = buttons.find(btn => btn.textContent?.includes('Buscar Producto'));
    expect(searchBtn).toBeTruthy();
  });

  it('should load active users on init for technician selector', () => {
    expect(adminApiSpy.getActiveUsers).toHaveBeenCalled();
    expect(component.technicians.length).toBe(2);
    expect(component.technicians[0].name).toBe('Técnico 1');
  });

  it('should call createRefillBatch once when completing refill', () => {
    // Add a product to the table
    component.dataSource.data = [{
      id: 1,
      name: 'Test Product',
      quantity: 1,
      assignedWorker: 'Técnico 1',
      operation: 'entrega',
      transactions: [],
      costPrice: 100,
      sellingPrice: 200,
    } as any];

    component.completeRefill();

    expect(salesApiSpy.createRefillBatch).toHaveBeenCalledTimes(1);
    expect(dataSyncSpy.notifyTransactionUpdate).toHaveBeenCalled();
  });

  it('should alert when assignedWorker is missing for any product', () => {
    spyOn(window, 'alert');
    component.dataSource.data = [{
      id: 1,
      name: 'Test Product',
      quantity: 1,
      assignedWorker: '', // empty!
      operation: 'entrega',
      transactions: [],
      costPrice: 100,
      sellingPrice: 200,
    } as any];

    component.completeRefill();

    expect(window.alert).toHaveBeenCalledWith('Por favor, asigne un técnico antes de realizar la operación.');
    expect(salesApiSpy.createRefillBatch).not.toHaveBeenCalled();
  });

  it('should clear dataSource.data only after successful batch', () => {
    component.dataSource.data = [{
      id: 1,
      name: 'Test Product',
      quantity: 1,
      assignedWorker: 'Técnico 1',
      operation: 'entrega',
      transactions: [],
      costPrice: 100,
      sellingPrice: 200,
    } as any];

    component.completeRefill();

    // After successful batch, dataSource should be cleared
    expect(component.dataSource.data.length).toBe(0);
  });

  it('should compute totalRefillValue from products', () => {
    component.dataSource.data = [
      { id: 1, name: 'P1', quantity: 2, assignedWorker: 'T1', operation: 'entrega', transactions: [], sellingPrice: 50, costPrice: 30 } as any,
      { id: 2, name: 'P2', quantity: 1, assignedWorker: 'T1', operation: 'entrega', transactions: [], sellingPrice: 100, costPrice: 70 } as any,
    ];

    // total value = (50 * 2) + (100 * 1) = 200
    const total = component.totalRefillValue;
    expect(total).toBe(200);
  });

  it('should remove product from refill list', () => {
    component.dataSource.data = [
      { id: 1, name: 'P1', quantity: 1, assignedWorker: '', operation: 'entrega', transactions: [] } as any,
      { id: 2, name: 'P2', quantity: 1, assignedWorker: '', operation: 'entrega', transactions: [] } as any,
    ];

    component.removeProductFromRefill(0);

    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].id).toBe(2);
  });
});
