import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MatDialog } from '@angular/material/dialog';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { getApiUrl } from 'src/app/services/api-url';
import { Product } from 'src/app/interface/warehouse';
import { ModalProductQrComponent } from '../modal-product-qr/modal-product-qr.component';
import { ModalConfirmComponent } from '../../shared/modal-confirm/modal-confirm.component';
import { ImageModalComponent } from '../../shared/image-modal/image-modal.component';
import { ModalEditProductComponent } from '../modal-edit-product/modal-edit-product.component';
import { ModalViewTransactionsComponent } from '../modal-view-transactions/modal-view-transactions.component';
import { ModalManageCategoriesComponent } from '../modal-manage-categories/modal-manage-categories.component';
import { DataSyncService } from 'src/app/services/data-sync.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { CategoriesApiService } from 'src/app/services/categories.api.service';
import { ModalService } from 'src/app/services/modal.service';
import { Subject, Subscription, debounceTime } from 'rxjs';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS],
})
export class ProductComponent implements OnInit {
  /** Página actual (server-side, máx 20 filas). */
  pageItems: Product[] = [];
  /** Total de la consulta activa (filtros incluidos). */
  totalCount = 0;
  /** Total de productos activos para el encabezado. */
  catalogTotal = 0;
  stockFilter: 'all' | 'stock' | 'low' = 'all';
  categoryFilter: string = 'all';
  searchField: 'name' | 'id' | 'location' | 'category' = 'name';
  readonly searchFields: { value: string; label: string }[] = [
    { value: 'name', label: 'Nombre' },
    { value: 'id', label: 'ID' },
    { value: 'location', label: 'Ubicación' },
    { value: 'category', label: 'Categoría' },
  ];
  searchQuery = '';
  /** Catálogo completo desde la API (incluye categorías sin productos). */
  categories: { id: number; name: string }[] = [];
  categoryNames: string[] = [];
  pageSize = 20;
  pageIndex = 0;
  loading = true;

  private searchTerms = new Subject<void>();
  private searchSub?: Subscription;

  private readonly productsApi = inject(ProductsApiService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly modal = inject(ModalService);
  private readonly dataSyncService = inject(DataSyncService);
  private readonly snackbarService = inject(SnackbarService);

  get totalProducts(): number { return this.catalogTotal; }
  get totalCategories(): number { return this.categoryNames.length; }
  get filteredCount(): number { return this.totalCount; }
  get pageCount(): number { return Math.max(1, Math.ceil(this.totalCount / this.pageSize)); }
  get startIndex(): number { return Math.min(this.pageIndex * this.pageSize, this.totalCount); }
  get endIndex(): number { return Math.min(this.startIndex + this.pageItems.length, this.totalCount); }
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

  ngOnInit(): void {
    this.loadCatalogTotal();
    this.loadProducts();
    this.loadCategories();
    // Búsqueda server-side con debounce (no golpear al server por tecla).
    this.searchTerms.pipe(debounceTime(250)).subscribe(() => this.loadProducts(0));
    // Escucha las notificaciones de actualización de transacción
    this.dataSyncService.transactionUpdated$.subscribe(() => {
      this.loadProducts();
    });
  }

  /** Catálogo de categorías desde la API (fuente única, sin duplicados). */
  loadCategories(): void {
    this.categoriesApi.getCategories().subscribe({
      next: (categories) => {
        this.categories = (categories ?? []).map((c) => ({ id: c.id, name: c.name }));
        this.categoryNames = this.categories.map((c) => c.name);
      },
      error: () => {
        this.categories = [];
        this.categoryNames = [];
      },
    });
  }

  loadProducts(page = this.pageIndex): void {
    this.loading = true;
    this.pageIndex = page;
    this.productsApi
      .searchProducts(
        this.searchQuery.trim(),
        this.searchField,
        this.pageSize,
        page * this.pageSize,
        this.categoryFilter,
        this.stockFilter,
      )
      .subscribe({
        next: (res) => {
          this.pageItems = res.items;
          this.totalCount = res.total;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.pageItems = [];
          this.totalCount = 0;
        },
      });
  }

  loadCatalogTotal(): void {
    this.productsApi.countActive().subscribe((n) => (this.catalogTotal = Number(n) || 0));
  }

  /** Búsqueda server-side (debounced desde el template). */
  onSearchChange(): void {
    this.searchTerms.next();
  }

  /** Stock filter chips: el filtro corre en el server (recarga página 0). */
  setStockFilter(filter: 'all' | 'stock' | 'low'): void {
    this.stockFilter = filter;
    this.loadProducts(0);
  }

  /** Public alias para el template (ngModelChange). */
  onCategoryChange(): void {
    this.loadProducts(0);
  }

  goPage(page: number): void {
    if (page >= 0 && page < this.pageCount) {
      this.loadProducts(page);
    }
  }

  /** Código de producto estilo prototipo: P-001, P-002... */
  productCode(product: Product): string {
    const id = product.id ?? 0;
    return `P-${String(id).padStart(3, '0')}`;
  }

  /** Ícono por categoría (product.image guarda el nombre del ícono). */
  productIcon(product: Product): string {
    const img = product.image;
    if (!img) return 'image';
    if (/^(https?:)?\/\//.test(img) || img.includes('/') || img.startsWith('assets/')) return 'image';
    return img;
  }

  /** ¿El producto tiene una imagen real (ruta/URL) y no solo un nombre de ícono? */
  hasRealImage(product: Product): boolean {
    const img = product.image;
    if (!img) return false;
    return /^(https?:)?\/\//.test(img) || img.includes('/') || img.startsWith('assets/');
  }

  /** Abre la vista previa grande: imagen real o placeholder "Sin imagen". */
  openProductImage(product: Product): void {
    this.openImageModal(
      this.hasRealImage(product) ? this.getImageUrl(product.image) : 'assets/img/no-image-available.png',
    );
  }

  /** Stock state badge (prototype: ≤2 Crítico, 3-6 Bajo, ≥7 En stock). */
  stockBadgeClass(stock?: number): string {
    if (stock === undefined || stock <= 2) return 'badge-error';
    if (stock <= 6) return 'badge-warning';
    return 'badge-success';
  }

  stockBadgeLabel(stock?: number): string {
    if (stock === undefined || stock <= 2) return 'Crítico';
    if (stock <= 6) return 'Bajo';
    return 'En stock';
  }

  /** Categoría visible en la fila (join del backend; — si no tiene). */
  categoryName(product: Product): string {
    return (product as any).category?.name ?? '—';
  }

  // Método para obtener la URL completa de la imagen
  getImageUrl(imagePath: string | null | undefined): string {
    return imagePath ? `${getApiUrl()}/${imagePath.replace(/^\/+/, '')}` : '';
  }

  openImageModal(imageUrl?: string): void {
    this.modal.open(ImageModalComponent, {
      size: 'full',
      data: { imageUrl: imageUrl || 'assets/img/no-image-available.png' }
    });
  }

  openTransactionModal(product: Product): void {
    if (product.id !== undefined) {
      this.productsApi.getProductTransactions(product.id).subscribe(transactions => {
        this.modal.open(ModalViewTransactionsComponent, {
          // Ancho según contenido: crece con las columnas activadas hasta el tope.
          size: 'auto',
          data: { product, transactions }
        });
      });
    } else {
      console.error('El ID del producto es indefinido');
    }
  }

  /** Abre el modal con el QR de identificación del producto. */
  openProductQrModal(product: Product): void {
    this.modal.open(ModalProductQrComponent, {
      size: 'sm',
      data: { product },
    });
  }

  openEditProductModal(product: Product): void {
    const dialogRef = this.modal.open(ModalEditProductComponent, {
      size: 'lg',
      data: { product, categories: this.categories },
    });

    // Recargar productos después de actualizar un producto
    dialogRef.afterClosed().subscribe(result => {
      if (result === 'updated') {
        this.loadProducts();
      }
    });
  }

  /** Abre el modal de creación de producto (prototipo: "+ Agregar producto"). */
  openAddProductModal(): void {
    const dialogRef = this.modal.open(ModalEditProductComponent, {
      size: 'lg',
      data: { product: { name: '', transactions: [] }, categories: this.categories },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'created' || result === 'updated') {
        this.loadProducts();
      }
    });
  }

  /** Abre el CRUD de categorías; recarga catálogo y filtro si hubo cambios. */
  openManageCategories(): void {
    this.modal
      .open(ModalManageCategoriesComponent, { size: 'md' })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) {
          this.loadCategories();
          this.loadProducts();
        }
      });
  }

  /** Soft delete con confirmación (acción de fila: eliminar). */
  openDeleteProductModal(product: Product): void {
    const dialogRef = this.modal.open(ModalConfirmComponent, {
      size: 'sm',
      data: { message: `¿Eliminar "${product.name}"? Se marcará como inactivo.` },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed && product.id) {
        this.productsApi.softDeleteProduct(product.id).subscribe(() => {
          this.snackbarService.success('Producto eliminado');
          this.loadProducts();
        });
      }
    });
  }
}
