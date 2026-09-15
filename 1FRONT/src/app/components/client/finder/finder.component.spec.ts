import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { FinderComponent } from './finder.component';
import { ClientsApiService } from 'src/app/services/clients.api.service';
import { OrdersApiService } from 'src/app/services/orders.api.service';
import { LoadingService } from 'src/app/services/loading.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { ModalOrderDetailComponent } from '../modal-order-detail/modal-order-detail.component';

describe('FinderComponent', () => {
  let component: FinderComponent;
  let fixture: ComponentFixture<FinderComponent>;
  let clientsApiSpy: jasmine.SpyObj<ClientsApiService>;
  let ordersApiSpy: jasmine.SpyObj<OrdersApiService>;
  let loadingSpy: jasmine.SpyObj<LoadingService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;

  const clients = [
    { id: 1, name: 'cliente uno', rut_raw: '11111111-1', rut_normalizado: '11111111-1', phone: '9 5555 1111', address: 'Av. Uno 1', city: 'Santiago', email: 'uno@mail.cl', company_name: 'Empresa Uno' },
    { id: 2, name: 'cliente dos', rut_raw: '22222222-2', rut_normalizado: '22222222-2', phone: '9 5555 2222', address: 'Av. Dos 2', city: 'Valparaíso', email: 'dos@mail.cl', company_name: 'Particular' },
  ];

  /** Resultado server-side por defecto: cliente uno con 2 órdenes, cliente dos con 1. */
  const searchResult = () => ({
    items: [
      { ...clients[0], orderCount: 2 },
      { ...clients[1], orderCount: 1 },
    ],
    total: 2,
  });

  /** Últimas órdenes globales (GET /order/recent): órdenes 11, 12 y 13. */
  const recentResult = () => ({
    items: [
      { id: 13, description: '', observation: '', comment: '', date: new Date(), status: 'Cancelado', total: 0, client: clients[1] },
      { id: 12, description: '', observation: '', comment: '', date: new Date(), status: 'Entregado', total: 20000, client: clients[0] },
      { id: 11, description: '', observation: '', comment: '', date: new Date(), status: 'Pendiente', total: 45000, client: clients[0] },
    ],
    total: 8123,
  });

  beforeEach(async () => {
    clientsApiSpy = jasmine.createSpyObj('ClientsApiService', ['exportClients', 'searchClients', 'getCountClients']);
    ordersApiSpy = jasmine.createSpyObj('OrdersApiService', ['findOrderByUser', 'getRecentOrders']);
    loadingSpy = jasmine.createSpyObj('LoadingService', ['setLoading']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['openSnackBar', 'success', 'error']);

    clientsApiSpy.searchClients.and.returnValue(of(searchResult() as any));
    clientsApiSpy.getCountClients.and.returnValue(of(2));
    ordersApiSpy.getRecentOrders.and.returnValue(of(recentResult() as any));
    ordersApiSpy.findOrderByUser.and.returnValue(
      of({ ...clients[0], orders: [
        { id: 11, description: '', observation: '', comment: '', date: new Date(), status: 'Pendiente', total: 45000 },
        { id: 12, description: '', observation: '', comment: '', date: new Date(), status: 'Entregado', total: 20000 },
      ] }) as any
    );

    await TestBed.configureTestingModule({
      imports: [FinderComponent, NoopAnimationsModule],
      providers: [
        { provide: ClientsApiService, useValue: clientsApiSpy },
        { provide: OrdersApiService, useValue: ordersApiSpy },
        { provide: LoadingService, useValue: loadingSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
      ],
    }).compileComponents();

    // MatDialogModule provides MatDialog at module level (Material 21),
    // shadowing the root TestBed provider — override at component level.
    TestBed.overrideComponent(FinderComponent, {
      set: { providers: [{ provide: MatDialog, useValue: dialogSpy }] },
    });

    fixture = TestBed.createComponent(FinderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Poblar resultados como si hubiera una búsqueda activa (server-side).
    component.clientSearch = 'query';
    (component as any).runSearch();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load summary and recent orders without dumping all clients', () => {
    expect(clientsApiSpy.getCountClients).toHaveBeenCalled();
    expect(ordersApiSpy.getRecentOrders).toHaveBeenCalledWith(6);
    expect(clientsApiSpy.exportClients).not.toHaveBeenCalled();
    expect(component.totalClients).toBe(2);
    expect(component.totalOrders).toBe(8123);
    expect(component.ordersTable.length).toBe(3);
  });

  it('should export clients as a server-generated CSV blob', () => {
    clientsApiSpy.exportClients.and.returnValue(of(new Blob(['csv'], { type: 'text/csv' })));
    const realCreate = document.createElement.bind(document);
    const anchor = document.createElement('a');
    const clickSpy = spyOn(anchor, 'click');
    spyOn(document, 'createElement').and.callFake((tag: string) =>
      tag === 'a' ? anchor : realCreate(tag));
    spyOn(URL, 'createObjectURL').and.returnValue('blob:mock');
    spyOn(URL, 'revokeObjectURL');

    component.exportClients();

    expect(clientsApiSpy.exportClients).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(anchor.download).toMatch(/^clients-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    expect(loadingSpy.setLoading).toHaveBeenCalledWith(false);
  });

  it('should stop the loading state and warn when the export fails', () => {
    clientsApiSpy.exportClients.and.returnValue(throwError(() => new Error('boom')));

    component.exportClients();

    expect(loadingSpy.setLoading).toHaveBeenCalledWith(false);
    expect(snackbarSpy.openSnackBar).toHaveBeenCalledWith('Error al exportar clientes. Intente nuevamente.');
  });

  it('should show the search prompt when no query is entered', () => {
    component.clientSearch = '';
    (component as any).runSearch();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.clients.length).toBe(0);
    expect(compiled.textContent).toContain('Escribe en el buscador para ver clientes.');
  });

  it('should render searched clients with RUT, name, phone and order count', () => {
    (component as any).runSearch();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Cliente uno');
    expect(compiled.textContent).toContain('11.111.111-1');
    expect(compiled.textContent).toContain('9 5555 1111');
    expect(component.clients.find((c) => c.id === 1)?.orderCount).toBe(2);
    expect(component.clients.find((c) => c.id === 2)?.orderCount).toBe(1);
  });

  it('should search server-side with the active field after debounce', fakeAsync(() => {
    clientsApiSpy.searchClients.and.returnValue(of({ items: [], total: 0 }));
    component.searchField = 'rut';
    component.clientSearch = '222';
    component.onSearchChange();
    tick(250);
    expect(clientsApiSpy.searchClients).toHaveBeenCalledWith('222', 'rut');
  }));

  it('should clear results when the search box is emptied', fakeAsync(() => {
    component.clientSearch = 'uno';
    component.onSearchChange();
    tick(250);
    expect(component.clients.length).toBe(2);

    component.clientSearch = '   ';
    component.onSearchChange();
    tick(250);
    expect(component.clients.length).toBe(0);
    expect(component.totalMatches).toBe(0);
  }));

  it('should mark results as truncated when the server reports more matches', () => {
    clientsApiSpy.searchClients.and.returnValue(of({ items: searchResult().items, total: 500 } as any));
    component.clientSearch = 'a';
    (component as any).runSearch();
    expect(component.truncated).toBeTrue();
    expect(component.totalMatches).toBe(500);
  });

  it('should reset to first page when the search changes', () => {
    component.goPage(2);
    component.onSearchChange();
    expect(component.pageIndex).toBe(0);
  });

  it('should sort clients by name ascending and toggle to descending', () => {
    component.sortBy('name');
    expect(component.sortField).toBe('name');
    expect(component.sortDir).toBe('asc');
    // "cliente dos" < "cliente uno" alfabéticamente
    expect(component.filteredClients.map((c) => c.id)).toEqual([2, 1]);

    component.sortBy('name'); // toggle
    expect(component.sortDir).toBe('desc');
    expect(component.filteredClients.map((c) => c.id)).toEqual([1, 2]);
  });

  it('should sort by orderCount numerically', () => {
    // cliente uno tiene 2 órdenes, cliente dos tiene 1
    component.sortBy('orderCount');
    expect(component.filteredClients.map((c) => c.orderCount)).toEqual([1, 2]);
    component.sortBy('orderCount');
    expect(component.filteredClients.map((c) => c.orderCount)).toEqual([2, 1]);
  });

  it('should keep the API order when no sort is active', () => {
    expect(component.sortField).toBeNull();
    expect(component.filteredClients.map((c) => c.id)).toEqual([1, 2]);
  });

  it('should render the recent orders panel with total and status badge', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Órdenes recientes');
    expect(compiled.textContent).toContain('ORD-1049'); // 1038 + 11
    expect(compiled.textContent).toContain('Pendiente');
    expect(compiled.textContent).toContain('Entregado');
    expect(component.ordersTable.length).toBe(3);
    expect(component.ordersTable[0].description).toBeDefined();
  });

  it('should show client summary and description column when a client is selected', () => {
    component.clientSearch = 'uno';
    (component as any).runSearch();
    fixture.detectChanges();
    component.selectClient(component.clients[0]);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // Resumen del cliente
    expect(compiled.textContent).toContain('N° Cliente');
    expect(compiled.textContent).toContain('Av. Uno 1');
    // Columna descripción en vez de total
    expect(compiled.textContent).toContain('Descripción');
    expect(compiled.textContent).not.toContain('$45.000');
  });

  it('should open the order detail modal when clicking an order row', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    component.openOrderDetail(component.ordersTable[0]);
    expect(dialogSpy.open).toHaveBeenCalledWith(
      ModalOrderDetailComponent,
      jasmine.objectContaining({ maxWidth: '560px' })
    );
  });

  it('should open order detail from global recents even without an active search', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    // Sin búsqueda activa ni cliente seleccionado: clients queda vacío.
    component.clientSearch = '';
    (component as any).runSearch();
    component.selectedClient = null;
    const row = component.ordersTable[0]; // orden 13 del cliente 2

    component.openOrderDetail(row);

    expect(dialogSpy.open).toHaveBeenCalledWith(
      ModalOrderDetailComponent,
      jasmine.objectContaining({
        data: jasmine.objectContaining({
          client: jasmine.objectContaining({ id: 2, name: 'cliente dos' }),
        }),
      })
    );
  });

  it('should warn instead of failing silently when a recent order has no client', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    component.clientSearch = '';
    (component as any).runSearch();
    component.selectedClient = null;
    const orphan = { ...component.ordersTable[0], clientId: 0 } as any;

    component.openOrderDetail(orphan);

    expect(dialogSpy.open).not.toHaveBeenCalled();
    expect(snackbarSpy.openSnackBar).toHaveBeenCalledWith('No se encontró el cliente de esta orden.');
  });

  it('should refresh data when the order detail reports a status change', () => {
    const refreshSpy = spyOn(component as any, 'refresh').and.stub();
    dialogSpy.open.and.returnValue({ afterClosed: () => of({ changed: true }) } as any);
    component.openOrderDetail(component.ordersTable[0]);
    expect(refreshSpy).toHaveBeenCalled();
  });

  it('should show empty state in orders panel when no orders exist', () => {
    ordersApiSpy.getRecentOrders.and.returnValue(of({ items: [], total: 0 } as any));
    (component as any).loadRecent();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Sin órdenes registradas');
  });

  it('should map status to badge classes', () => {
    expect(component.statusBadgeClass('Entregado')).toBe('badge-success');
    expect(component.statusBadgeClass('Completado')).toBe('badge-success');
    expect(component.statusBadgeClass('Pendiente')).toBe('badge-warning');
    expect(component.statusBadgeClass('Cancelado')).toBe('badge-error');
    expect(component.statusBadgeClass('En reparacion')).toBe('badge-neutral');
  });

  it('should label "En reparacion" as "En reparación"', () => {
    expect(component.statusLabel('En reparacion')).toBe('En reparación');
    expect(component.statusLabel('Entregado')).toBe('Entregado');
  });

  it('should open edit and delete modals for a client', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);
    component.showModalEditUser(clients[0] as any);
    expect(dialogSpy.open).toHaveBeenCalled();
    component.showModalDeleteUser(clients[0] as any);
    expect(dialogSpy.open).toHaveBeenCalled();
  });

  it('should open the orders modal for a client', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);
    component.showOrderDetails(clients[0] as any);
    expect(ordersApiSpy.findOrderByUser).toHaveBeenCalled();
    expect(dialogSpy.open).toHaveBeenCalled();
    expect(loadingSpy.setLoading).toHaveBeenCalledWith(false);
  });

  it('should paginate clients 10 per page within the search results', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1, name: `cliente ${i + 1}`, rut_raw: `${i}`, orderCount: 0,
    }));
    component.clients = many as any;
    fixture.detectChanges();

    expect(component.pageCount).toBe(3);
    expect(component.pageClients.length).toBe(10);
    expect(component.pageClients[0].id).toBe(1);

    component.goPage(2);
    expect(component.pageIndex).toBe(2);
    expect(component.pageClients.length).toBe(5);
    expect(component.pageClients[0].id).toBe(21);

    component.goPage(99);
    expect(component.pageIndex).toBe(2);
  });

  it('should render a compact page window with ellipsis for many pages', () => {
    const many = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1, name: `cliente ${i + 1}`, rut_raw: `${i}`, orderCount: 0,
    }));
    component.clients = many as any;
    fixture.detectChanges();

    expect(component.pageCount).toBe(10); // 100 / 10
    expect(component.visiblePages.length).toBeLessThanOrEqual(7);
    // Página intermedia: 0, …, 8, 9, (10 no existe) → 0, …, 8, 9
    component.goPage(9);
    expect(component.visiblePages).toEqual([0, '…', 8, 9]);
  });

  it('should load the selected client orders from the server', () => {
    component.clientSearch = 'uno';
    (component as any).runSearch();
    component.selectClient(component.clients[0]);
    expect(component.selectedClient?.id).toBe(1);
    expect(component.ordersTable.length).toBe(2); // solo las 2 órdenes del cliente 1
    expect(component.ordersTable.every((o) => o.clientName === 'cliente uno')).toBeTrue();
  });

  it('should clear selection and restore global recent orders', () => {
    component.selectClient(component.clients[0]);
    component.selectClient(null);
    expect(component.selectedClient).toBeNull();
    expect(component.ordersTable.length).toBe(3); // recientes globales
  });
});
