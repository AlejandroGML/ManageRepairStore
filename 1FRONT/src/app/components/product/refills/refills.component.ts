import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { Product } from 'src/app/interface/warehouse';
import { SalesApiService } from 'src/app/services/sales.api.service';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { DataSyncService } from 'src/app/services/data-sync.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { ModalRefillSuccessComponent } from '../modal-refill-success/modal-refill-success.component';

interface HistoryRow {
  id: number;
  date: string;
  product: string;
  qty: number;
  provider: string;
  /** Stock previo (antes de la entrada) — null si la tx no trae finalStock. */
  prevStock: number | null;
  /** Stock posterior (finalStock server-side). */
  postStock: number | null;
  /** Solo para ordenar (no se muestra). */
  sortDate: number;
}

@Component({
  selector: 'app-refills',
  templateUrl: './refills.component.html',
  styleUrls: ['./refills.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
})
export class RefillsComponent implements OnInit {
  products: Product[] = [];
  selectedProductId: number | null = null;
  quantity = 10;
  costPrice = 0;
  provider = '';
  invoice = '';
  submitting = false;
  history: HistoryRow[] = [];

  private readonly salesApi = inject(SalesApiService);
  private readonly productsApi = inject(ProductsApiService);
  private readonly dataSyncService = inject(DataSyncService);
  private readonly snackbar = inject(SnackbarService);
  private readonly dialog = inject(MatDialog);

  ngOnInit(): void {
    this.loadCatalog();
    this.loadHistory();
  }

  private loadCatalog(): void {
    this.productsApi.getProductsWithLastTransaction().subscribe((products: Product[]) => {
      this.products = products;
      // Preselect the first product (prototype shows one preselected)
      if (products.length > 0) {
        this.selectedProductId = products[0].id ?? null;
        this.onProductChange();
      }
    });
  }

  /**
   * Historial derivado de las transacciones de stock de GET /product/active:
   * entradas con quantity > 0 (reposiciones). El PROVEEDOR viaja en
   * tx.description. Muestra stock previo → posterior (finalStock server-side).
   */
  private loadHistory(): void {
    this.productsApi.getActiveProducts().subscribe((products: Product[]) => {
      const rows: HistoryRow[] = [];
      for (const p of products ?? []) {
        for (const tx of p.transactions ?? []) {
          if ((tx.quantity ?? 0) <= 0) continue; // solo entradas de stock
          const createdAt = tx.createdAt ? new Date(tx.createdAt) : null;
          const postStock = tx.finalStock !== undefined && tx.finalStock !== null
            ? Number(tx.finalStock)
            : null;
          const prevStock = postStock !== null ? postStock - Math.abs(tx.quantity ?? 0) : null;
          rows.push({
            id: tx.id,
            date: createdAt ? this.shortDate(createdAt) : '',
            product: p.name,
            qty: Math.abs(tx.quantity ?? 0),
            provider: tx.description?.trim() || '—',
            prevStock,
            postStock,
            sortDate: createdAt?.getTime() ?? 0,
          });
        }
      }
      // Más reciente primero.
      rows.sort((a, b) => b.sortDate - a.sortDate);
      this.history = rows;
    });
  }

  /** Detalle legible del proveedor/factura (sin el prefijo "Reposición de stock ·"). */
  providerLabel(h: HistoryRow): string {
    return h.provider.replace(/^Reposición de stock\s*·\s*/i, '');
  }

  /** Fecha corta estilo prototipo: "30 ago". */
  private shortDate(d: Date): string {
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '').replace('-', '');
    return `${day} ${month}`;
  }

  /** Formato moneda sin decimales para placeholders: "52.000". */
  formatMoney(value: number): string {
    return Math.round(value).toLocaleString('es-CL');
  }

  /** Focus al formulario de nueva entrada (botón "+ Nueva reposición"). */
  focusForm(): void {
    document.getElementById('new-entry')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onProductChange(): void {
    const product = this.products.find((p) => p.id === this.selectedProductId);
    if (!product) return;
    const cached = this.lastCostFor(product);
    if (cached > 0) {
      this.costPrice = cached;
      return;
    }
    // El GET solo trae la última tx (puede ser una venta sin costo):
    // buscar el último costo real en el historial completo del producto.
    if (product.id !== undefined) {
      this.productsApi.getProductTransactions(product.id).subscribe((txs) => {
        const lastCost = [...txs].reverse().find((tx) => tx.costPrice);
        this.costPrice = lastCost?.costPrice ?? 0;
      });
    }
  }

  /** Último costo unitario conocido: la transacción más reciente CON costo
   *  (una venta puede ser la última tx sin costPrice). */
  private lastCostFor(product: Product): number {
    const txs = product.transactions ?? [];
    for (const tx of [...txs].reverse()) {
      if (tx.costPrice) return tx.costPrice;
    }
    return product.costPrice ?? 0;
  }

  registerEntry(): void {
    if (!this.selectedProductId) return;
    if (!this.quantity || this.quantity <= 0) {
      this.snackbar.error('Ingresa una cantidad válida');
      return;
    }
    if (this.costPrice <= 0) {
      this.snackbar.error('Ingresa un costo unitario válido');
      return;
    }

    this.submitting = true;
    this.salesApi
      .createRefillBatch({
        products: [
          {
            productId: this.selectedProductId,
            quantity: Math.abs(this.quantity),
            operation: 'Entrada Producto',
            description: `Reposición de stock${this.provider ? ' · ' + this.provider : ''}${this.invoice ? ' · FAC ' + this.invoice : ''}`,
            costPrice: this.costPrice,
          },
        ],
        totalValue: this.quantity * this.costPrice,
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.selectedProductId = this.products[0]?.id ?? null;
          this.quantity = 10;
          this.costPrice = 0;
          this.provider = '';
          this.invoice = '';
          this.onProductChange();
          this.dialog.open(ModalRefillSuccessComponent, { width: '300px' });
          this.loadHistory();
          this.dataSyncService.notifyTransactionUpdate();
        },
        error: (err) => {
          this.submitting = false;
          this.snackbar.error(err.error?.message || 'Error al registrar la entrada');
        },
      });
  }
}