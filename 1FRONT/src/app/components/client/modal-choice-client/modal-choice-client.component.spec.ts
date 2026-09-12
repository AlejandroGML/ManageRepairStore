import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatTableDataSource } from '@angular/material/table';

import { ModalChoiceClientComponent } from './modal-choice-client.component';
import { Client } from 'src/app/interface/client';

describe('ModalChoiceClientComponent', () => {
  let component: ModalChoiceClientComponent;
  let fixture: ComponentFixture<ModalChoiceClientComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ModalChoiceClientComponent>>;

  const mockClients: Client[] = [
    { id: 1, name: 'Client A', rut: '11111111-1', rut_raw: '11111111-1', address: 'Addr A', city: 'City A', phone: '111', code: 100, company_name: 'Empresa A' } as unknown as Client,
    { id: 2, name: 'Client B', rut: '22222222-2', rut_raw: '22222222-2', address: 'Addr B', city: 'City B', phone: '222', code: 200, company_name: 'Sucursal B' } as unknown as Client,
  ];

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ModalChoiceClientComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { users: mockClients, rut: '11111111-1' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalChoiceClientComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize dataSource with provided users', () => {
    expect(component.dataSource.data.length).toBe(2);
    expect(component.dataSource.data[0].name).toBe('Client A');
    expect(component.dataSource.data[1].name).toBe('Client B');
  });

  it('should set rut from injected data', () => {
    expect(component.rut).toBe('11111111-1');
  });

  it('should close with selected client when selectClient is called', () => {
    const selectedClient = mockClients[0];
    component.selectClient(selectedClient);
    expect(dialogRefSpy.close).toHaveBeenCalledWith(selectedClient);
  });

  it('should close with null when close() is invoked', () => {
    component.close();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
  });

  it('should include company_name in displayedColumns', () => {
    expect(component.displayedColumns).toContain('company_name');
  });

  it('should paginate clients 10 per page', () => {
    const many: Client[] = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Client ${i + 1}` }) as unknown as Client);
    component.dataSource = new MatTableDataSource<Client>(many);
    expect(component.pageCount).toBe(3);
    expect(component.pageClients.length).toBe(10);
    expect(component.pageClients[0].id).toBe(1);

    component.goPage(2);
    expect(component.pageIndex).toBe(2);
    expect(component.pageClients.length).toBe(5);
    expect(component.pageClients[0].id).toBe(21);

    component.goPage(99);
    expect(component.pageIndex).toBe(2); // fuera de rango: no cambia
  });
});
