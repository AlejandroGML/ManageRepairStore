import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { ClientsApiService, ClientSearchResult } from 'src/app/services/clients.api.service';
import { OrdersApiService } from 'src/app/services/orders.api.service';
import { LoadingService } from 'src/app/services/loading.service';
import { MatDialog } from '@angular/material/dialog';
import { ModalOrdersComponent } from '../modal-orders/modal-orders.component';
import { ModalEditClientComponent } from '../modal-edit-client/modal-edit-client.component';
import { ModalDeleteClientComponent } from '../modal-delete-client/modal-delete-client.component';
import {
  ModalOrderDetailComponent,
  OrderDetailData,
} from '../modal-order-detail/modal-order-detail.component';
import { Client, Order } from 'src/app/interface/client';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { I18nService } from '../../../i18n/i18n.service';
import { NamePipe } from 'src/app/pipes/name.pipe';
import { RutPipe } from 'src/app/pipes/rut.pipe';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { ModalService } from 'src/app/services/modal.service';

interface ClientRow extends Client {
  orderCount: number;
}

interface OrderRow {
  id: number;
  code: string;
  clientId: number;
  clientName: string;
  clientRut?: string;
  clientRutNorm?: string;
  clientAddress?: string;
  clientCity?: string;
  clientPhone?: string;
  date?: Date;
  description?: string;
  observation?: string;
  comment?: string;
  total: number;
  status: string;
}

/** Campo por el que se filtra la búsqueda de clientes (uno a la vez). */
type SearchField = 'id' | 'rut' | 'name' | 'email' | 'company' | 'city';

@Component({
  selector: 'app-finder',
  templateUrl: './finder.component.html',
  styleUrls: ['./finder.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS, NamePipe, RutPipe],
})
export class FinderComponent implements OnInit, OnDestroy {
  private readonly clientsApi = inject(ClientsApiService);
  private readonly ordersApi = inject(OrdersApiService);
  private readonly loadingService = inject(LoadingService);
  private readonly modal = inject(ModalService);
  private readonly snackbarService = inject(SnackbarService);
  private readonly i18n = inject(I18nService);

  /** Clientes del resultado de búsqueda actual (server-side, sin dump completo). */
  clients: ClientRow[] = [];
  ordersTable: OrderRow[] = [];
  totalClients = 0;
  /** Total de coincidencias de la búsqueda (puede exceder el límite traído). */
  totalMatches = 0;
  /** true cuando hay más coincidencias que las traídas (afinar búsqueda). */
  truncated = false;
  totalOrders = 0;
  clientSearch = '';
  /** Campo activo del filtro de clientes (solo se busca con ese campo). */
  searchField: SearchField = 'name';
  /** i18n keys — resolved with the `t` pipe so they follow the live language. */
  readonly searchFields: { value: SearchField; label: string }[] = [
    { value: 'id', label: 'finder.searchFieldId' },
    { value: 'rut', label: 'finder.searchFieldRut' },
    { value: 'name', label: 'finder.searchFieldName' },
    { value: 'email', label: 'finder.searchFieldEmail' },
    { value: 'company', label: 'finder.searchFieldCompany' },
    { value: 'city', label: 'finder.searchFieldCity' },
  ];
  /** Cliente seleccionado: sus órdenes recientes se muestran en el panel derecho. */
  selectedClient: ClientRow | null = null;

  /** Paginación de la tabla de clientes (10 por página, mismo patrón custom). */
  pageSize = 10;
  pageIndex = 0;

  /** Ordenamiento por columna (null = orden de la API). */
  sortField: 'rut' | 'name' | 'phone' | 'orderCount' | null = null;
  sortDir: 'asc' | 'desc' = 'asc';

  /** Búsqueda con debounce para no golpear al server por cada tecla. */
  private searchTerms = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor() {
    // Sin distinctUntilChanged: el Subject emite void (siempre "igual") y
    // tragaría todas las emisiones tras la primera. El debounce basta.
    this.searchTerms
      .pipe(debounceTime(250), takeUntil(this.destroy$))
      .subscribe(() => this.runSearch());
  }

  ngOnInit(): void {
    this.loadSummary();
    this.loadRecent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Convierte una orden cruda + su cliente en la fila que consume la UI. */
  private toOrderRow(o: any, c: any): OrderRow {
    return {
      id: o.id ?? 0,
      code: o.code ?? this.orderCode(o.id),
      clientId: c.id ?? 0,
      clientName: c.name ?? '',
      clientRut: c.rut_raw,
      clientRutNorm: c.rut_normalizado,
      clientAddress: c.address,
      clientCity: c.city,
      clientPhone: c.phone,
      date: o.date ? new Date(o.date) : undefined,
      description: o.description ?? '',
      observation: o.observation ?? '',
      comment: o.comment ?? '',
      total: o.total ?? 0,
      status: o.status ?? 'Pendiente',
    };
  }

  /** Totales para el encabezado (clientes + órdenes registradas). */
  private loadSummary(): void {
    this.clientsApi.getCountClients().subscribe((n) => {
      this.totalClients = Number(n) || 0;
    });
  }

  /** Panel de órdenes recientes globales (solo 6 filas desde el server). */
  private loadRecent(): void {
    this.ordersApi.getRecentOrders(6).subscribe(({ items, total }) => {
      this.totalOrders = total;
      if (!this.selectedClient) {
        this.ordersTable = items.map((o) => this.toOrderRow(o, o.client ?? {}));
      }
    });
  }

  /** Reintenta la búsqueda activa (tras editar/eliminar/detalle). */
  private refresh(): void {
    this.loadSummary();
    this.loadRecent();
    if (this.clientSearch.trim()) this.runSearch();
  }

  /** Búsqueda server-side por el campo activo (se llama con debounce). */
  private runSearch(): void {
    const q = this.clientSearch.trim();
    if (!q) {
      this.clients = [];
      this.totalMatches = 0;
      this.truncated = false;
      return;
    }
    this.clientsApi.searchClients(q, this.searchField).subscribe((res: ClientSearchResult) => {
      this.clients = res.items as ClientRow[];
      this.totalMatches = res.total;
      this.truncated = res.total > res.items.length;
    });
  }

  /** Selecciona un cliente (fila) y muestra sus órdenes recientes en el panel. */
  selectClient(client: ClientRow | null): void {
    this.selectedClient = client;
    if (!client) {
      this.loadRecent();
      return;
    }
    if (client.id === undefined) {
      this.ordersTable = [];
      return;
    }
    this.ordersApi.findOrderByUser(client).subscribe((data: any) => {
      const list = data?.orders ?? [];
      this.ordersTable = list
        .map((o: any) => this.toOrderRow(o, client))
        .sort((a: OrderRow, b: OrderRow) => b.code.localeCompare(a.code))
        .slice(0, 6);
    });
  }

  /** Código de orden estilo prototipo: ORD-1039, ORD-1040... */
  orderCode(id?: number): string {
    return `ORD-${1038 + (id ?? 0)}`;
  }

  /** Placeholder del buscador según el campo activo. */
  get searchPlaceholder(): string {
    const map: Record<SearchField, string> = {
      id: this.i18n.t('finder.searchId'),
      rut: this.i18n.t('finder.searchRut'),
      name: this.i18n.t('finder.searchName'),
      email: this.i18n.t('finder.searchEmail'),
      company: this.i18n.t('finder.searchCompany'),
      city: this.i18n.t('finder.searchCity'),
    };
    return map[this.searchField];
  }

  /** Al cambiar filtro o texto, vuelve a la primera página y agenda la búsqueda. */
  onSearchChange(): void {
    this.pageIndex = 0;
    this.searchTerms.next();
  }

  /** Cambia de columna o alterna la dirección de ordenamiento. */
  sortBy(field: NonNullable<typeof this.sortField>): void {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }
    this.pageIndex = 0;
  }

  /** Ordena la lista filtrada según sortField/sortDir. */
  private sortClients(list: ClientRow[]): ClientRow[] {
    if (!this.sortField) return list;
    const dir = this.sortDir === 'asc' ? 1 : -1;
    const field = this.sortField;
    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'rut':
          cmp = String(a.rut_raw ?? '').replace(/[.-]/g, '')
            .localeCompare(String(b.rut_raw ?? '').replace(/[.-]/g, ''));
          break;
        case 'name':
          cmp = (a.name ?? '').localeCompare(b.name ?? '', 'es');
          break;
        case 'phone':
          cmp = (a.phone ?? '').localeCompare(b.phone ?? '');
          break;
        case 'orderCount':
          cmp = (a.orderCount ?? 0) - (b.orderCount ?? 0);
          break;
      }
      return cmp * dir;
    });
  }

  /** El server ya filtró; aquí solo se ordena el subconjunto traído. */
  get filteredClients(): ClientRow[] {
    return this.sortClients(this.clients);
  }

  get pageCount(): number { return Math.max(1, Math.ceil(this.filteredClients.length / this.pageSize)); }
  get startIndex(): number { return Math.min(this.pageIndex * this.pageSize, this.filteredClients.length); }
  get endIndex(): number { return Math.min(this.startIndex + this.pageSize, this.filteredClients.length); }
  get pageClients(): ClientRow[] { return this.filteredClients.slice(this.startIndex, this.endIndex); }
  /**
   * Páginas visibles con ventana compacta (primera, última, actual ±1 y elipsis)
   * para que la paginación no desborde el marco con decenas de botones.
   */
  get visiblePages(): (number | '…')[] {
    const total = this.pageCount;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);
    const current = this.pageIndex;
    const pages: (number | '…')[] = [0];
    if (current > 2) pages.push('…');
    for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) pages.push(i);
    if (current < total - 3) pages.push('…');
    pages.push(total - 1);
    return pages;
  }

  goPage(page: number): void {
    if (page >= 0 && page < this.pageCount) this.pageIndex = page;
  }

  /** Badge class por estado de orden (prototipo). */
  statusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'entregado':
      case 'completado':
        return 'badge-success';
      case 'pendiente':
        return 'badge-warning';
      case 'cancelado':
        return 'badge-error';
      default:
        return 'badge-neutral';
    }
  }

  /** Estado con tilde (prototipo: "En reparación"). */
  statusLabel(status: string): string {
    return status === 'En reparacion' ? this.i18n.t('finder.statusInRepair') : status;
  }

  showOrderDetails(client: Client): void {
    this.loadingService.setLoading(true);
    this.ordersApi.findOrderByUser(client).subscribe((data) => {
      this.openOrderModal(data);
      this.loadingService.setLoading(false);
    }, () => {
      this.loadingService.setLoading(false);
      this.snackbarService.openSnackBar(this.i18n.t('finder.searchError'));
    });
  }

  /**
   * Cliente reconstruido desde la fila de órdenes recientes: GET /order/recent
   * ya trae el cliente joinneado, así que el detalle funciona incluso cuando
   * el cliente no está en los resultados de búsqueda actuales.
   */
  private clientFromRecentRow(row: OrderRow): Client | null {
    if (!row.clientId) return null;
    return {
      id: row.clientId,
      name: row.clientName,
      rut_raw: row.clientRut,
      rut_normalizado: row.clientRutNorm,
      address: row.clientAddress,
      city: row.clientCity,
      phone: row.clientPhone,
    } as Client;
  }

  /** Abre el detalle de UNA orden (clic en la fila de órdenes recientes). */
  openOrderDetail(row: OrderRow): void {
    const client =
      this.clients.find((c) => c.id === row.clientId) ??
      this.selectedClient ??
      this.clientFromRecentRow(row);
    if (!client) {
      this.snackbarService.openSnackBar(this.i18n.t('finder.clientNotFound'));
      return;
    }
    const order: Order = {
      id: row.id,
      code: row.code,
      description: row.description ?? '',
      observation: row.observation ?? '',
      date: row.date ?? new Date(),
      status: row.status,
      comment: row.comment ?? '',
    };
    this.modal.open(ModalOrderDetailComponent, {
      size: 'md',
      data: { client, order } as OrderDetailData,
      disableClose: true,
    }).afterClosed().subscribe((res: { changed?: boolean } | undefined) => {
      // Si cambió el estado dentro del detalle, refrescar órdenes y conteos.
      if (res?.changed) this.refresh();
    });
  }

  showModalEditUser(client: Client): void {
    const copy = { ...client };
    this.modal.open(ModalEditClientComponent, {
      size: 'lg',
      data: copy,
      disableClose: true,
    }).afterClosed().subscribe((newClient: Client) => {
      if (newClient) {
        this.refresh();
      }
    });
  }

  showModalDeleteUser(client: Client): void {
    this.modal.open(ModalDeleteClientComponent, {
      size: 'sm',
      data: client,
      disableClose: true,
    }).afterClosed().subscribe((id: number) => {
      if (id) {
        this.snackbarService.success(this.i18n.t('finder.clientDeleted'));
        this.refresh();
      }
    });
  }

  openOrderModal(client: Client): void {
    this.modal.open(ModalOrdersComponent, {
      size: 'xl',
      data: client,
      disableClose: true,
    });
  }

  /**
   * Exporta los clientes como XLSX con formato generado por el backend (GET /client/export):
   * el RPi ya no sirve un dump JSON completo solo para el botón Exportar.
   */
  exportClients(): void {
    this.loadingService.setLoading(true);
    this.clientsApi.exportClients().subscribe({
      next: (blob) => {
        this.loadingService.setLoading(false);
        this.downloadBlob(blob, `clients-${new Date().toISOString().slice(0, 10)}.xlsx`);
        this.snackbarService.openSnackBar(this.i18n.t('finder.exportSuccess'));
      },
      error: () => {
        this.loadingService.setLoading(false);
        this.snackbarService.openSnackBar(this.i18n.t('finder.exportError'));
      },
    });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
