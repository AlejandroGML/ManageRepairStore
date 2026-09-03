import { Component, OnInit, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { ClientsApiService } from 'src/app/services/clients.api.service';
import { OrdersApiService } from 'src/app/services/orders.api.service';
import { LoadingService } from 'src/app/services/loading.service';
import { MatDialog } from '@angular/material/dialog';
import { ModalOrdersComponent } from '../modal-orders/modal-orders.component';
import { ModalEditClientComponent } from '../modal-edit-client/modal-edit-client.component';
import { ModalDeleteClientComponent } from '../modal-delete-client/modal-delete-client.component';
import { ModalConfirmComponent } from '../../shared/modal-confirm/modal-confirm.component';
import { Client } from 'src/app/interface/client';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { NamePipe } from 'src/app/pipes/name.pipe';
import { RutPipe } from 'src/app/pipes/rut.pipe';
import * as XLSX from 'xlsx';

interface ClientRow extends Client {
  orderCount: number;
}

interface OrderRow {
  code: string;
  clientName: string;
  total: number;
  status: string;
}

@Component({
  selector: 'app-finder',
  templateUrl: './finder.component.html',
  styleUrls: ['./finder.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS, NamePipe, RutPipe],
})
export class FinderComponent implements OnInit {
  private readonly clientsApi = inject(ClientsApiService);
  private readonly ordersApi = inject(OrdersApiService);
  private readonly loadingService = inject(LoadingService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbarService = inject(SnackbarService);

  clients: ClientRow[] = [];
  ordersTable: OrderRow[] = [];
  /** Todas las órdenes por cliente (para filtrar el panel al seleccionar). */
  private ordersByClient = new Map<number, OrderRow[]>();
  totalOrders = 0;
  clientSearch = '';
  /** Cliente seleccionado: sus órdenes recientes se muestran en el panel derecho. */
  selectedClient: ClientRow | null = null;

  /** Paginación de la tabla de clientes (10 por página, mismo patrón custom). */
  pageSize = 10;
  pageIndex = 0;

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    // GET /order/all devuelve clientes con sus órdenes.
    this.ordersApi.getAllOrders().subscribe((clientsWithOrders) => {
      const counts = new Map<number, number>();
      const orders: OrderRow[] = [];
      this.ordersByClient = new Map();
      for (const c of clientsWithOrders ?? []) {
        const list = c.orders ?? [];
        if (c.id !== undefined) {
          counts.set(c.id, list.length);
          this.ordersByClient.set(
            c.id,
            list
              .map((o: any): OrderRow => ({
                code: o.code ?? this.orderCode(o.id),
                clientName: c.name,
                total: o.total ?? 0,
                status: o.status ?? 'Pendiente',
              }))
              .sort((a: OrderRow, b: OrderRow) => b.code.localeCompare(a.code))
          );
        }
        for (const o of list) {
          orders.push({
            code: (o as any).code ?? this.orderCode(o.id),
            clientName: c.name,
            total: (o as any).total ?? 0,
            status: o.status ?? 'Pendiente',
          });
        }
      }
      orders.sort((a, b) => b.code.localeCompare(a.code));
      this.totalOrders = orders.length;
      this.ordersTable = orders.slice(0, 6);

      this.clientsApi.getAllClients().subscribe((allClients) => {
        this.clients = (allClients ?? []).map((c) => ({
          ...c,
          orderCount: counts.get(c.id ?? 0) ?? 0,
        }));
        // Si había un cliente seleccionado y ya no está en la lista, deseleccionar.
        if (this.selectedClient) {
          const stillThere = this.clients.some((c) => c.id === this.selectedClient?.id);
          if (!stillThere) this.selectClient(null);
        }
      });
    });
  }

  /** Selecciona un cliente (fila) y muestra sus órdenes recientes en el panel. */
  selectClient(client: ClientRow | null): void {
    this.selectedClient = client;
    if (client?.id !== undefined && this.ordersByClient.has(client.id)) {
      this.ordersTable = (this.ordersByClient.get(client.id) ?? []).slice(0, 6);
    } else if (client) {
      this.ordersTable = [];
    } else {
      // Sin selección: mostrar las recientes globales.
      this.ordersTable = [...this.ordersByClient.values()]
        .flat()
        .sort((a, b) => b.code.localeCompare(a.code))
        .slice(0, 6);
    }
  }

  /** Código de orden estilo prototipo: ORD-1039, ORD-1040... */
  orderCode(id?: number): string {
    return `ORD-${1038 + (id ?? 0)}`;
  }

  get filteredClients(): ClientRow[] {
    const q = this.clientSearch.trim().toLowerCase().replace(/[.-]/g, '');
    if (!q) return this.clients;
    return this.clients.filter((c) => {
      const name = (c.name ?? '').toLowerCase();
      const rut = (c.rut_raw ?? '').toLowerCase().replace(/[.-]/g, '');
      return name.includes(q) || rut.includes(q);
    });
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
    return status === 'En reparacion' ? 'En reparación' : status;
  }

  showOrderDetails(client: Client): void {
    this.loadingService.setLoading(true);
    this.ordersApi.findOrderByUser(client).subscribe((data) => {
      this.openOrderModal(data);
      this.loadingService.setLoading(false);
    }, () => {
      this.loadingService.setLoading(false);
      this.snackbarService.openSnackBar('Error al buscar. Intente nuevamente.');
    });
  }

  showModalEditUser(client: Client): void {
    const copy = { ...client };
    this.dialog.open(ModalEditClientComponent, {
      width: '90vw',
      maxWidth: '720px',
      maxHeight: '90vh',
      data: copy,
      disableClose: true,
    }).afterClosed().subscribe((newClient: Client) => {
      if (newClient) {
        this.loadData();
      }
    });
  }

  showModalDeleteUser(client: Client): void {
    this.dialog.open(ModalDeleteClientComponent, {
      width: '90vw',
      maxWidth: '400px',
      maxHeight: '90vh',
      data: client,
      disableClose: true,
    }).afterClosed().subscribe((id: number) => {
      if (id) {
        this.dialog.open(ModalConfirmComponent, {
          width: '90vw',
          maxWidth: '400px',
          maxHeight: '90vh',
          data: { message: 'Cliente eliminado exitosamente' },
          disableClose: true,
        });
        this.loadData();
      }
    });
  }

  openOrderModal(client: Client): void {
    this.dialog.open(ModalOrdersComponent, {
      width: '95vw',
      maxWidth: '1100px',
      maxHeight: '90vh',
      data: client,
      disableClose: true,
    });
  }

  exportToExcel(): void {
    this.loadingService.setLoading(true);
    this.clientsApi.getAllClients().subscribe({
      next: (allClients) => {
        this.loadingService.setLoading(false);
        if (!allClients || allClients.length === 0) {
          this.snackbarService.openSnackBar('No hay clientes para exportar.');
          return;
        }

        const clientData = allClients.map((client) => ({
          'N°': client.id || '',
          'Nombre': client.name || '',
          'RUT': client.rut_raw || '',
          'Teléfono': client.phone || '',
          'Email': client.email || '',
          'Dirección': client.address || '',
          'Ciudad': client.city || '',
          'Empresa': client.company_name || 'Particular',
        }));

        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(clientData, { skipHeader: false });
        const workbook: XLSX.WorkBook = { Sheets: { 'Clientes': worksheet }, SheetNames: ['Clientes'] };

        XLSX.writeFile(workbook, 'Lista_de_Clientes.xlsx');
        this.snackbarService.openSnackBar(`Exportados ${clientData.length} clientes`);
      },
      error: () => {
        this.loadingService.setLoading(false);
        this.snackbarService.openSnackBar('Error al obtener clientes. Intente nuevamente.');
      },
    });
  }
}
