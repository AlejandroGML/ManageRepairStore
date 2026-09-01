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
  total: number;
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
  quantity = 1;
  costPrice = 0;
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
    this.productsApi.getProductsWithLastTransaction().subscribe((products) => {
      this.products = products;
    });
  }

  private loadHistory(): void {
    this.salesApi.getRefillsHistory().subscribe((groups: RefillGroup[]) => {
      this.history = groups.flatMap((g) =>
        (g.transactions ?? []).map((tx) => ({
          id: g.id ?? 0,
          date: g.createdAt ? new Date(g.createdAt).toLocaleDateString('es-CL') : '',
          product: tx.product ? (tx.product as any).name ?? '—' : '—',
          qty: Math.abs(tx.quantity ?? 0),
          total: Number(g.totalValue ?? 0),
        })),
      );
    });
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
            description: 'Reposición de stock',
            costPrice: this.costPrice,
          },
        ],
        totalValue: this.quantity * this.costPrice,
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.selectedProductId = null;
          this.quantity = 1;
          this.costPrice = 0;
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