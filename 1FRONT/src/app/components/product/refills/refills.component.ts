import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { Product } from '../../../interface/warehouse';
import { SalesApiService } from '../../../services/sales.api.service';
import {
  ProductsApiService,
  RefillHistoryRow,
} from '../../../services/products.api.service';
import { DataSyncService } from '../../../services/data-sync.service';
import { SnackbarService } from '../../../services/snackbar.service';
import { I18nService } from '../../../i18n/i18n.service';
import { TPipe } from '../../../i18n/t.pipe';

const PAGE_SIZE = 20;

type SearchField = 'name' | 'id' | 'location' | 'category';

@Component({
  selector: 'app-refills',
  templateUrl: './refills.component.html',
  styleUrls: ['./refills.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TPipe],
})
export class RefillsComponent implements OnInit, OnDestroy {
  // Declared before searchFields: its labels resolve i18n in the field initializer.
  private readonly i18n = inject(I18nService);

  // ---- Búsqueda server-side de producto ----
  searchField: SearchField = 'name';
  readonly searchFields: { value: SearchField; label: string }[] = [
    { value: 'name', label: this.i18n.t('refills.fieldName') },
    { value: 'id', label: this.i18n.t('refills.fieldId') },
    { value: 'location', label: this.i18n.t('refills.fieldLocation') },
    { value: 'category', label: this.i18n.t('refills.fieldCategory') },
  ];
  searchQuery = '';
  searchResults: Product[] = [];
  searchTotal = 0;
  searching = false;
  selectedProduct: Product | null = null;

  // ---- Formulario ----
  quantity: number = 10;
  detail = '';
  submitting = false;

  // ---- Historial paginado (server-side) ----
  historyRows: RefillHistoryRow[] = [];
  historyTotal = 0;
  historyPage = 0;
  readonly pageSize = PAGE_SIZE;

  private searchTerms = new Subject<void>();
  private destroy$ = new Subject<void>();
  private searchSub?: Subscription;

  private readonly salesApi = inject(SalesApiService);
  private readonly productsApi = inject(ProductsApiService);
  private readonly dataSyncService = inject(DataSyncService);
  private readonly snackbar = inject(SnackbarService);

  ngOnInit(): void {
    this.searchTerms.pipe(debounceTime(250)).subscribe(() => this.runSearch());
    this.loadHistory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchSub?.unsubscribe();
  }

  /** Busca productos en el server por el campo elegido (debounced). */
  onSearchChange(): void {
    this.searchTerms.next();
  }

  private runSearch(): void {
    const q = this.searchQuery.trim();
    if (!q) {
      this.searchResults = [];
      this.searchTotal = 0;
      return;
    }
    this.searching = true;
    this.searchSub?.unsubscribe();
    this.searchSub = this.productsApi
      .searchProducts(q, this.searchField, PAGE_SIZE)
      .subscribe({
        next: (res) => {
          this.searchResults = res.items;
          this.searchTotal = res.total;
          this.searching = false;
        },
        error: () => {
          this.searching = false;
        },
      });
  }

  selectProduct(p: Product): void {
    this.selectedProduct = p;
    this.searchResults = [];
    this.searchQuery = p.name; // deja el nombre como referencia
  }

  clearSelection(): void {
    this.selectedProduct = null;
    this.searchQuery = '';
    this.quantity = 10;
    this.detail = '';
  }

  /** Advertencia visible cuando la cantidad es negativa (descuento). */
  get isDiscount(): boolean {
    return (this.quantity ?? 0) < 0;
  }

  get canSubmit(): boolean {
    return !!this.selectedProduct && this.quantity !== null && this.quantity !== 0 && !this.submitting;
  }

  registerEntry(): void {
    if (!this.selectedProduct || this.selectedProduct.id === undefined) return;
    const qty = this.quantity ?? 0;
    if (qty === 0) {
      this.snackbar.error(this.i18n.t('refills.errorZeroQuantity'));
      return;
    }
    this.submitting = true;
    const isDiscount = qty < 0;
    const baseDescription = isDiscount ? 'Descuento de stock' : 'Reposición de stock';
    const description = this.detail.trim()
      ? `${baseDescription} · ${this.detail.trim()}`
      : baseDescription;

    this.salesApi
      .createRefillBatch({
        products: [
          {
            productId: this.selectedProduct.id,
            quantity: qty, // con signo: negativo descuenta stock (mutateStock 409 si no alcanza)
            operation: isDiscount ? 'Descuento de stock' : 'Entrada Producto',
            description,
            costPrice: qty > 0 ? (this.selectedProduct.costPrice ?? 0) : 0,
          },
        ],
        totalValue: 0,
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.clearSelection();
          this.historyPage = 0;
          this.snackbar.success(
            isDiscount
              ? this.i18n.t('refills.successDiscount')
              : this.i18n.t('refills.successRefill')
          );
          this.loadHistory();
          this.dataSyncService.notifyTransactionUpdate();
        },
        error: (err) => {
          this.submitting = false;
          this.snackbar.error(err.error?.message || this.i18n.t('refills.errorRegister'));
        },
      });
  }

  // ---- Historial paginado (server-side) ----

  loadHistory(): void {
    this.productsApi
      .getRefillHistory(PAGE_SIZE, this.historyPage * PAGE_SIZE)
      .subscribe((page) => {
        this.historyRows = page.items;
        this.historyTotal = page.total;
      });
  }

  get historyMaxPage(): number {
    return Math.max(0, Math.ceil(this.historyTotal / this.pageSize) - 1);
  }

  goHistoryPage(page: number): void {
    const maxPage = Math.max(0, Math.ceil(this.historyTotal / this.pageSize) - 1);
    this.historyPage = Math.min(Math.max(page, 0), maxPage);
    this.loadHistory();
  }

  get historyRangeLabel(): string {
    if (!this.historyTotal) return '0';
    const from = this.historyPage * this.pageSize + 1;
    const to = Math.min(from + this.historyRows.length - 1, this.historyTotal);
    return this.i18n.t('refills.rangeLabel', { from, to, total: this.historyTotal });
  }

  /** Detalle legible (sin el prefijo histórico "Reposición de stock ·"). */
  detailLabel(row: RefillHistoryRow): string {
    return row.description.replace(/^(Reposición de stock|Descuento de stock)\s*·\s*/i, '').trim() || '—';
  }

  shortDate(value: string): string {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '').replace('-', '');
    return `${day} ${month}`;
  }

}
