import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MatDialog } from '@angular/material/dialog';
import { Product } from 'src/app/interface/warehouse';
import { SalesApiService, SalePdfPayload } from 'src/app/services/sales.api.service';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { AuthService } from 'src/app/services/auth.service';
import { ModalProductSearchComponent } from '../../product/modal-product-search/modal-product-search.component';
import { DataSyncService } from 'src/app/services/data-sync.service';
import { Subscription } from 'rxjs';
import { ModalService } from 'src/app/services/modal.service';
import { I18nService } from '../../../i18n/i18n.service';

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
  cartItems: SaleProduct[] = [];
  totalSaleValue: number = 0;
  submitting = false;

  /**
   * Última venta completada: su resumen queda visible (con su PDF descargado)
   * hasta que se empiece a elegir productos para una venta nueva.
   */
  lastSale: (SalePdfPayload & { dateLabel: string }) | null = null;

  /** Catálogo de productos para el POS (grid clickeable). */
  catalog: Product[] = [];
  catalogFiltered: Product[] = [];
  catalogQuery = '';
  categoryFilter = 'all';
  categoryNames: string[] = [];
  catalogLoading = true;

  private readonly salesApi = inject(SalesApiService);
  private readonly productsApi = inject(ProductsApiService);
  private readonly modal = inject(ModalService);
  private readonly dataSyncService = inject(DataSyncService);
  private readonly snackbar = inject(SnackbarService);
  private readonly authService = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly saleSubscriptions = new Subscription();

  ngOnInit(): void {
    this.loadCatalog();
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

  filterCatalog(): void {
    const q = this.catalogQuery.trim().toLowerCase();
    let list = q
      ? this.catalog.filter(
          (p) => p.name.toLowerCase().includes(q) || String(p.id).includes(q)
        )
      : this.catalog;
    if (this.categoryFilter !== 'all') {
      list = list.filter((p) => (p as any).category?.name === this.categoryFilter);
    }
    this.catalogFiltered = list;
  }

  /** Public alias para el template (ngModelChange del select). */
  onCategoryChange(): void {
    this.filterCatalog();
  }

  /** Ícono del tile (product.image guarda el nombre del ícono). */
  productIcon(product: Product): string {
    const img = product.image;
    if (!img) return 'image';
    if (/^(https?:)?\/\//.test(img) || img.includes('/') || img.startsWith('assets/')) return 'image';
    return img;
  }

  /** Categoría del tile (join del backend; — si no tiene). */
  categoryName(product: Product): string {
    return (product as any).category?.name ?? '—';
  }

  /** Badge del tile: "X en stock" con tono según stock. */
  tileStockClass(stock: number): string {
    if (stock <= 2) return 'badge-error';
    if (stock <= 6) return 'badge-warning';
    return 'badge-success';
  }

  /** Descuento total acumulado (para el panel de totales del carrito). */
  get totalDiscount(): number {
    return this.cartItems.reduce((sum, item) => sum + (item.purchaseDiscount ?? 0), 0);
  }

  /** Suma de precios por cantidad, antes de descuentos. */
  get subtotalValue(): number {
    return this.cartItems.reduce(
      (sum, item) => sum + (item.sellingPrice ?? 0) * (item.quantity ?? 0),
      0
    );
  }

  /** Usuario autenticado (para el resumen de compra). */
  get currentUser() {
    return this.authService.getCurrentUser();
  }

  /** Fecha corta actual para el resumen. */
  get todayLabel(): string {
    return new Intl.DateTimeFormat('es-CL', {
      day: 'numeric',
      month: 'long',
    }).format(new Date());
  }

  clearCart(): void {
    this.cartItems = [];
    this.updateTotalSaleValue();
  }

  /** Stock efectivo para mostrar en el catálogo. */
  productStock(product: Product): number {
    if (product.stock !== undefined) return product.stock;
    return 0;
  }

  /** true si el producto ya está en el carrito (bloquea re-agregado). */
  isInCart(product: Product): boolean {
    return this.cartItems.some((item) => item.id === product.id);
  }

  /**
   * Tope de descuento vigente del producto: lo porta la última transacción
   * que NO es venta (registro/reposición/edición). Las ventas no deben
   * alterar la política de descuento — leer la última a secas devolvía 0.
   */
  private effectiveMaxDiscount(product: Product): number {
    const txs = product.transactions ?? [];
    for (let i = txs.length - 1; i >= 0; i--) {
      if (txs[i].operation !== 'Venta Producto') {
        return txs[i].maxDiscount ?? 0;
      }
    }
    return 0;
  }

  openProductSearch(): void {
    const addedProductIds = this.cartItems.map((item) => item.id);
    const dialogRef = this.modal.open(ModalProductSearchComponent, {
      size: 'xl',
      data: { addedProductIds }
    });

    dialogRef.afterClosed().subscribe((selectedProduct: Product) => {
      if (selectedProduct) {
        this.addProductToSale(selectedProduct);
      }
    });
  }

  addProductToSale(product: Product): void {
    // Un producto se elige una sola vez: después se ajusta cantidad en el carrito.
    if (this.isInCart(product)) {
      this.snackbar.openSnackBar(
        this.i18n.t('sales.alreadyInCart', { name: product.name })
      );
      return;
    }

    // Empezó una venta nueva: se descarta el resumen de la última completada.
    this.lastSale = null;

    // La última transacción es la más reciente (orden de inserción ASC).
    const lastTransaction =
      product.transactions && product.transactions.length > 0
        ? product.transactions[product.transactions.length - 1]
        : null;

    const saleProduct: SaleProduct = {
      ...product,
      quantity: 1,
      sellingPrice: product.sellingPrice ?? lastTransaction?.sellingPrice ?? 0,
      purchaseDiscount: 0,
      maxDiscount: this.effectiveMaxDiscount(product),
    };

    // Valor final: sellingPrice * quantity - purchaseDiscount
    saleProduct.finalValue =
      (saleProduct.sellingPrice ?? 0) * saleProduct.quantity - saleProduct.purchaseDiscount;

    this.cartItems = [...this.cartItems, saleProduct];
    this.updateTotalSaleValue();
  }

  adjustQuantity(index: number, requested: number): void {
    const product = this.cartItems[index];
    const maxStock = Math.max(product.stock ?? 0, 0);
    // Tope duro: no se puede vender más que el stock disponible.
    const quantity = Math.min(Math.max(Math.floor(requested) || 1, 1), Math.max(maxStock, 1));
    product.quantity = quantity;
    product.finalValue =
      (product.sellingPrice ?? 0) * product.quantity - product.purchaseDiscount;
    this.updateTotalSaleValue();
  }

  updateTotalSaleValue(): void {
    this.totalSaleValue = this.cartItems.reduce(
      (sum: number, item: SaleProduct) => sum + (item.finalValue ?? 0),
      0
    );
  }

  applyDiscount(index: number, discount: number): void {
    const product = this.cartItems[index];

    // Tope de descuento según maxDiscount (política vigente del producto)
    const capped = Math.max(
      Math.min(discount ?? 0, product.maxDiscount ?? 0),
      0
    );
    product.purchaseDiscount = capped;

    // Recalcular finalValue
    product.finalValue =
      (product.sellingPrice ?? 0) * product.quantity - product.purchaseDiscount;

    // Forzar change detection reemplazando la referencia
    this.cartItems = [...this.cartItems];
    this.updateTotalSaleValue();
  }

  removeProductFromSale(index: number): void {
    const data = [...this.cartItems];
    data.splice(index, 1);
    this.cartItems = data;
    this.updateTotalSaleValue();
  }

  /** Carrito vacío: la acción queda bloqueada (spec: no se envía request). */
  get cartEmpty(): boolean {
    return this.cartItems.length === 0;
  }

  /** Hay resumen que mostrar: carrito activo o última venta completada. */
  get hasSummary(): boolean {
    return this.cartItems.length > 0 || !!this.lastSale;
  }

  /** Líneas del resumen (carrito actual o última venta). */
  get summaryItems(): Array<{ name: string; quantity: number; finalValue: number }> {
    if (this.cartItems.length) {
      return this.cartItems.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        finalValue: i.finalValue ?? 0,
      }));
    }
    return (this.lastSale?.products ?? []).map((p) => ({
      name: p.name,
      quantity: p.quantity,
      finalValue: p.finalValue ?? 0,
    }));
  }

  get summarySubtotal(): number {
    return this.cartItems.length ? this.subtotalValue : (this.lastSale?.subtotal ?? 0);
  }

  get summaryDiscount(): number {
    return this.cartItems.length ? this.totalDiscount : (this.lastSale?.discount ?? 0);
  }

  get summaryTotal(): number {
    return this.cartItems.length ? this.totalSaleValue : (this.lastSale?.total ?? 0);
  }

  get summarySeller(): string {
    return this.cartItems.length ? (this.currentUser?.name ?? '—') : (this.lastSale?.seller ?? '—');
  }

  get summaryDateLabel(): string {
    return this.cartItems.length ? this.todayLabel : (this.lastSale?.dateLabel ?? this.todayLabel);
  }

  /** Payload del PDF según la fuente actual del resumen. */
  private buildPdfPayload(): SalePdfPayload {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    return {
      code: `VENTA-${stamp}`,
      date: now.toISOString(),
      seller: this.currentUser?.name ?? '—',
      products: this.cartItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice ?? 0,
        purchaseDiscount: item.purchaseDiscount ?? 0,
        finalValue: item.finalValue ?? 0,
      })),
      subtotal: this.subtotalValue,
      discount: this.totalDiscount,
      total: this.totalSaleValue,
    };
  }

  /** Descarga el comprobante PDF (server-side) para un payload dado. */
  private downloadPdf(payload: SalePdfPayload): void {
    this.salesApi.generateSalePdf(payload).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${payload.code}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => this.snackbar.error(this.i18n.t('sales.pdfError')),
    });
  }

  /**
   * Comprobante PDF de la venta (server-side, mismo diseño que la orden).
   * Si hay carrito lo genera del carrito; si ya se completó, de la última venta.
   */
  generatePurchasePdf(): void {
    if (!this.hasSummary) return;
    const payload = this.cartItems.length ? this.buildPdfPayload() : this.lastSale!;
    this.downloadPdf(payload);
  }

  completeSale(): void {
    if (this.submitting) return;
    if (this.cartItems.length === 0) return;
    this.submitting = true;

    const batchProducts = this.cartItems.map((product) => ({
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
        next: () => {
          // Capturamos el resumen ANTES de limpiar el carrito.
          const payload = this.buildPdfPayload();
          const now = new Date();
          this.lastSale = {
            ...payload,
            dateLabel: now.toLocaleString('es-CL', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            }),
          };
          this.cartItems = [];
          this.totalSaleValue = 0;
          this.submitting = false;
          this.snackbar.success(this.i18n.t('sales.success'));
          this.dataSyncService.notifyTransactionUpdate();
          this.loadCatalog();
          // Auto-descarga del comprobante para no perder la venta.
          this.downloadPdf(payload);
        },
        error: (err: any) => {
          this.submitting = false;
          // 409 (stock insuficiente) u otros errores: el mensaje del backend se muestra al usuario.
          this.snackbar.error(err.error?.message || this.i18n.t('sales.error'));
        },
      })
    );
  }
}
