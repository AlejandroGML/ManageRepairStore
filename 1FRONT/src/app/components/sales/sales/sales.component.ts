import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MatDialog } from '@angular/material/dialog';
import { Product } from 'src/app/interface/warehouse';
import { Client } from 'src/app/interface/client';
import { SalesApiService } from 'src/app/services/sales.api.service';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { ClientsApiService } from 'src/app/services/clients.api.service';
import { AuthService } from 'src/app/services/auth.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { MatTableDataSource } from '@angular/material/table';
import { ProductSearchModalComponent } from '../../product/product-search-modal/product-search-modal.component';
import { ModalChoiceClientComponent } from '../../client/modal-choice-client/modal-choice-client.component';
import { DataSyncService } from 'src/app/services/data-sync.service';
import { Subscription } from 'rxjs';
import jsPDF from 'jspdf';

interface SaleProduct extends Product {
  quantity: number;
  purchaseDiscount: number;
  finalValue?: number;
}

@Component({
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS],
})
export class SalesComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['name', 'sellingPrice', 'quantity', 'purchaseDiscount', 'finalValue', 'delete'];
  dataSource = new MatTableDataSource<SaleProduct>();
  totalSaleValue: number = 0;
  submitting = false;
  /** Catálogo de productos para el POS (grid clickeable). */
  catalog: Product[] = [];
  catalogFiltered: Product[] = [];
  catalogQuery = '';
  categoryFilter = 'all';
  categoryNames: string[] = [];
  catalogLoading = true;
  /** Cliente seleccionado (solo informativo — el batch no recibe clientId). */
  selectedClient: Client | null = null;
  clients: Client[] = [];
  get userLogged(): any { return this.authService.getCurrentUser(); }

  private readonly salesApi = inject(SalesApiService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly dataSyncService = inject(DataSyncService);
  private readonly snackbar = inject(SnackbarService);
  private readonly productsApi = inject(ProductsApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly saleSubscriptions = new Subscription();

  ngOnInit(): void {
    this.loadCatalog();
    this.clientsApi.getAllClients().subscribe((clients) => {
      this.clients = clients ?? [];
    });
  }

  ngOnDestroy(): void {
    this.saleSubscriptions.unsubscribe();
  }

  private loadCatalog(): void {
    this.catalogLoading = true;
    this.productsApi.getActiveProducts().subscribe((products: Product[]) => {
      this.catalog = (products ?? []).map((p) => {
        const lastTx =
          p.transactions && p.transactions.length > 0
            ? p.transactions[p.transactions.length - 1]
            : null;
        return {
          ...p,
          sellingPrice: p.sellingPrice ?? lastTx?.sellingPrice ?? 0,
        };
      });
      this.categoryNames = [
        ...new Set(
          this.catalog.map((p) => (p as any).category?.name).filter((n): n is string => !!n)
        ),
      ].sort();
      this.catalogLoading = false;
      this.filterCatalog();
    });
  }

  /** Selector de cliente del carrito (modal, estilo ABAGAS). */
  openClientSelector(): void {
    const dialogRef = this.dialog.open(ModalChoiceClientComponent, {
      width: '90vw',
      maxWidth: '600px',
      data: { users: this.clients, rut: '' },
    });

    dialogRef.afterClosed().subscribe((client: Client) => {
      if (client) {
        this.selectedClient = client;
      }
    });
  }

  filterCatalog(): void {
    const q = this.catalogQuery.trim().toLowerCase();
    let list = q
      ? this.catalog.filter((p) => p.name.toLowerCase().includes(q) || String(p.id).includes(q))
      : this.catalog;
    if (this.categoryFilter !== 'all') {
      list = list.filter((p) => p.category?.name === this.categoryFilter);
    }
    this.catalogFiltered = list;
  }

  /** Public alias para el template (ngModelChange del select). */
  onCategoryChange(): void {
    this.filterCatalog();
  }

  /** Ícono por categoría (seed: nombre del ícono en product.image). */
  productIcon(product: Product): string {
    const img = product.image;
    if (!img) return 'image';
    if (/^(https?:)?\/\//.test(img) || img.includes('/') || img.startsWith('assets/')) return 'image';
    return img;
  }

  /** Badge del tile: "X en stock" con tono según stock. */
  tileStockClass(stock: number): string {
    if (stock <= 2) return 'badge-error';
    if (stock <= 6) return 'badge-warning';
    return 'badge-success';
  }

  lastTicket(): void {
    this.snackbar.info('Ticket reimpreso');
  }

  scanProduct(): void {
    this.snackbar.info('Lector de código QR abierto');
  }

  /** Descuento total acumulado (para el panel de totales del carrito). */
  get totalDiscount(): number {
    return this.dataSource.data.reduce((sum, item) => sum + (item.purchaseDiscount ?? 0), 0);
  }

  clearCart(): void {
    this.dataSource.data = [];
    this.updateTotalSaleValue();
  }

  catalogStockTone(stock?: number): string {
    if (stock === undefined || stock <= 3) return 'crit';
    if (stock <= 8) return 'warn';
    return 'ok';
  }

  /** Stock efectivo para mostrar en el catálogo (última transacción si falta). */
  productStock(product: Product): number {
    if (product.stock !== undefined) return product.stock;
    const last = product.transactions?.[0];
    return last?.finalStock ?? 0;
  }

  openProductSearch(): void {
    const addedProductIds = this.dataSource.data.map(item => item.id);
    const dialogRef = this.dialog.open(ProductSearchModalComponent, {
      width: '70%',
      data: { addedProductIds }
    });

    dialogRef.afterClosed().subscribe((selectedProduct: Product) => {
      if (selectedProduct) {
        this.addProductToSale(selectedProduct);
      }
    });
  }

  addProductToSale(product: Product): void {
    // Use transactions[0] consistently (first = most recent if DESC ordering)
    const lastTransaction = product.transactions ? product.transactions[0] : null;

    const saleProduct: SaleProduct = {
        ...product,
        quantity: 1,
        sellingPrice: lastTransaction ? lastTransaction.sellingPrice ?? 0 : 0,
        purchaseDiscount: 0,
        maxDiscount: lastTransaction?.maxDiscount ?? 0,
    };

    // Compute finalValue with proper formula: sellingPrice * quantity - purchaseDiscount
    saleProduct.finalValue = (saleProduct.sellingPrice ?? 0) * saleProduct.quantity - saleProduct.purchaseDiscount;

    this.dataSource.data = [...this.dataSource.data, saleProduct];
    this.updateTotalSaleValue();
}

adjustQuantity(index: number, quantity: number): void {
    const product = this.dataSource.data[index];
    product.quantity = quantity;
    product.finalValue = (product.sellingPrice ?? 0) * product.quantity - product.purchaseDiscount;
    this.updateTotalSaleValue();
}

updateTotalSaleValue(): void {
    this.totalSaleValue = this.dataSource.data.reduce((sum: number, item: SaleProduct) => sum + (item.finalValue ?? 0), 0);
}

  

applyDiscount(index: number, discount: number): void {
  const product = this.dataSource.data[index];
  
  // Cap discount to maxDiscount
  product.purchaseDiscount = discount > (product.maxDiscount ?? 0) ? (product.maxDiscount ?? 0) : discount;

  // Recalculate finalValue
  product.finalValue = (product.sellingPrice ?? 0) * product.quantity - product.purchaseDiscount;
  
  // Force Angular change detection by replacing the dataSource reference
  this.dataSource.data = [...this.dataSource.data];
  this.updateTotalSaleValue();
}

  generatePDF(): void {
    const doc = new jsPDF();
    doc.text("Detalle de Venta", 10, 10);
    let yOffset = 20;

    this.dataSource.data.forEach((item: SaleProduct, index: number) => {
      const lastTransaction = item.transactions ? item.transactions[0] : null;
      doc.text(`${index + 1}. Producto: ${item.name}`, 10, yOffset);
      doc.text(`   Precio: ${lastTransaction ? lastTransaction.sellingPrice : 0}`, 10, yOffset + 10);
      doc.text(`   Cantidad: ${item.quantity}`, 10, yOffset + 20);
      doc.text(`   Descuento: ${item.purchaseDiscount}`, 10, yOffset + 30);
      doc.text(`   Valor Total: ${item.finalValue}`, 10, yOffset + 40);
      yOffset += 50;
    });

    doc.text(`Valor Total de Venta: ${this.totalSaleValue}`, 10, yOffset);
    doc.save('detalle_venta.pdf');
  }

  removeProductFromSale(index: number): void {
    const data = this.dataSource.data;
    data.splice(index, 1);
    this.dataSource.data = [...data];
    this.updateTotalSaleValue();
  }

  completeSale(): void {
    if (this.submitting) return;
    if (this.dataSource.data.length === 0) return;
    this.submitting = true;

    const batchProducts = this.dataSource.data.map(product => ({
      productId: product.id!,
      quantity: -Math.abs(product.quantity),
      sellingPrice: product.sellingPrice ?? 0,
      purchaseDiscount: product.purchaseDiscount ?? 0,
      location: product.location || 'Sin Datos',
      description: product.description || '',
    }));

    const total = this.totalSaleValue;

    this.saleSubscriptions.add(
      this.salesApi.createSaleBatch({ products: batchProducts, total }).subscribe({
        next: (sale) => {
          this.dataSource.data = [];
          this.totalSaleValue = 0;
          this.submitting = false;
          this.selectedClient = null;
          this.snackbar.success('Venta realizada correctamente');
          this.dataSyncService.notifyTransactionUpdate();
        },
        error: (err: any) => {
          this.submitting = false;
          this.snackbar.error(err.error?.message || 'Error al realizar la venta');
        }
      })
    );
  }
}