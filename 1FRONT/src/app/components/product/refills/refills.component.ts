import { Component, Input, OnInit, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MatDialog } from '@angular/material/dialog';
import { Product, RefillGroup } from 'src/app/interface/warehouse';
import { SalesApiService } from 'src/app/services/sales.api.service';
import { AdminApiService } from 'src/app/services/admin.api.service';
import { MatTableDataSource } from '@angular/material/table';
import { ProductRefillModalComponent } from '../product-refill-modal/product-refill-modal.component';
import { DataSyncService } from 'src/app/services/data-sync.service';
import { ModalRefillSuccessComponent } from '../modal-refill-success/modal-refill-success.component';

interface RefillProduct extends Product {
  quantity: number;
  assignedWorker: string;
  operation: string;
}

@Component({
  selector: 'app-refills',
  templateUrl: './refills.component.html',
  styleUrls: ['./refills.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS],
})
export class RefillsComponent implements OnInit {
  @Input() userLogged: any;
  displayedColumns: string[] = ['name', 'operation', 'quantity', 'assignedWorker', 'description', 'delete'];
  dataSource = new MatTableDataSource<RefillProduct>();

  submitting = false;
  loadingTechnicians = true;
  loadingOrders = true;

  selectedTechnicianId?: number;
  selectedOrderId?: number;
  technicians: any[] = [];
  orders: any[] = [];

  private readonly dialog = inject(MatDialog);
  private readonly salesApi = inject(SalesApiService);
  private readonly adminApi = inject(AdminApiService);
  private readonly dataSyncService = inject(DataSyncService);

  ngOnInit(): void {
    this.loadTechnicians();
    this.loadOrders();
  }

  private loadTechnicians(): void {
    this.loadingTechnicians = true;
    this.adminApi.getActiveUsers().subscribe({
      next: (users) => {
        this.technicians = users.filter((u: any) => u.active !== false);
        this.loadingTechnicians = false;
      },
      error: (err) => {
        console.error('Error loading technicians:', err);
        this.loadingTechnicians = false;
      },
    });
  }

  private loadOrders(): void {
    this.loadingOrders = true;
    this.adminApi.getAllOrders().subscribe({
      next: (clients) => {
        const openOrders: any[] = [];
        if (Array.isArray(clients)) {
          for (const client of clients) {
            if (client.orders && Array.isArray(client.orders)) {
              for (const order of client.orders) {
                if (order.status !== 'Cerrada' && order.status !== 'closed') {
                  openOrders.push({ ...order, clientName: client.name });
                }
              }
            }
          }
        }
        this.orders = openOrders;
        this.loadingOrders = false;
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        this.loadingOrders = false;
      },
    });
  }

  get totalRefillValue(): number {
    return this.dataSource.data.reduce(
      (sum, item) => sum + ((item.sellingPrice ?? 0) * Math.abs(item.quantity)),
      0,
    );
  }

  openProductSearch(): void {
    const addedProductIds = this.dataSource.data.map((item: RefillProduct) => item.id);
    const dialogRef = this.dialog.open(ProductRefillModalComponent, {
      width: '70%',
      data: { addedProductIds }
    });

    dialogRef.afterClosed().subscribe((selectedProduct: Product) => {
      if (selectedProduct) {
        this.addProductToRefill(selectedProduct);
      }
    });
  }

  addProductToRefill(product: Product): void {
    const lastTransaction = product.transactions && product.transactions.length > 0 
      ? product.transactions[product.transactions.length - 1] 
      : null;

    const refillProduct: RefillProduct = {
      ...product,
      quantity: 1,
      assignedWorker: '',
      operation: 'entrega',
      costPrice: lastTransaction?.costPrice ?? product.costPrice ?? 0,
      sellingPrice: lastTransaction?.sellingPrice ?? product.sellingPrice ?? 0,
    };

    this.dataSource.data = [...this.dataSource.data, refillProduct];
  }

  removeProductFromRefill(index: number): void {
    const data = this.dataSource.data;
    data.splice(index, 1);
    this.dataSource.data = [...data];
  }

  completeRefill(): void {
    // Validate technician assigned for each product or globally selected
    if (!this.selectedTechnicianId) {
      const missingTechnician = this.dataSource.data.some(
        (product: RefillProduct) => !product.assignedWorker || product.assignedWorker.trim() === ''
      );
      if (missingTechnician) {
        alert('Por favor, asigne un técnico antes de realizar la operación.');
        return;
      }
    }

    if (this.dataSource.data.length === 0) {
      alert('No hay productos para realizar la operación.');
      return;
    }

    // Build batch payload
    const batchProducts = this.dataSource.data.map((product: RefillProduct) => {
      const lastTransaction = product.transactions && product.transactions.length > 0
        ? product.transactions[product.transactions.length - 1]
        : null;

      return {
        productId: product.id!,
        quantity: product.operation === 'entrega' ? -Math.abs(product.quantity) : Math.abs(product.quantity),
        operation: product.operation === 'entrega' ? 'Asignación Repuesto Producto' : 'Devolución Repuesto Producto',
        description: product.description || '',
        sellingPrice: product.sellingPrice ?? lastTransaction?.sellingPrice ?? 0,
        costPrice: product.costPrice ?? lastTransaction?.costPrice ?? 0,
      };
    });

    const totalValue = batchProducts.reduce(
      (sum, p) => sum + ((p.sellingPrice ?? 0) * Math.abs(p.quantity ?? 0)),
      0,
    );

    this.submitting = true;
    this.salesApi.createRefillBatch({
      products: batchProducts,
      technicianId: this.selectedTechnicianId,
      orderId: this.selectedOrderId,
      totalValue,
    }).subscribe({
      next: (refillGroup: RefillGroup) => {
        this.submitting = false;
        this.dataSource.data = [];
        this.selectedTechnicianId = undefined;
        this.selectedOrderId = undefined;
        this.openSuccessModal();
        this.dataSyncService.notifyTransactionUpdate();
      },
      error: (error) => {
        this.submitting = false;
        console.error('Error al realizar el refill batch:', error);
        alert('Error al realizar la operación: ' + (error?.error?.message || error?.message || 'Error desconocido'));
      },
    });
  }

  // Método para abrir el diálogo de éxito
  openSuccessModal(): void {
    this.dialog.open(ModalRefillSuccessComponent, {
      width: '300px'
    });
  }
}
