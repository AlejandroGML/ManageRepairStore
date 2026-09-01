import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { Product, RefillGroup } from 'src/app/interface/warehouse';
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

  private loadHistory(): void {
    this.salesApi.getRefillsHistory().subscribe((groups: RefillGroup[]) => {
      this.history = groups.flatMap((g) =>
        (g.transactions ?? []).map((tx) => ({
          id: g.id ?? 0,
          date: g.createdAt ? this.shortDate(new Date(g.createdAt)) : '',
          product: tx.product ? (tx.product as any).name ?? '—' : '—',
          qty: Math.abs(tx.quantity ?? 0),
          provider: tx.description ?? '—',
        })),
      );
    });
  }

  /** Fecha corta estilo prototipo: "30 ago". */
  private shortDate(d: Date): string {
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }).replace('.', '');
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
    const last = product.transactions?.[product.transactions.length - 1];
    this.costPrice = last?.costPrice ?? product.costPrice ?? 0;
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