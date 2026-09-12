import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { Product } from '../../../interface/warehouse';
import {
  WorkersApiService,
  Worker,
  WorkerBalanceRow,
  WorkerMovementRow,
} from '../../../services/workers.api.service';
import { ProductsApiService } from '../../../services/products.api.service';
import { SnackbarService } from '../../../services/snackbar.service';

const PAGE_SIZE = 20;

interface MovementLine {
  productId: number | null;
  name: string;
  stock: number;
  quantity: number | null;
}

@Component({
  selector: 'app-repuestos',
  templateUrl: './repuestos.component.html',
  styleUrls: ['./repuestos.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
})
export class RepuestosComponent implements OnInit, OnDestroy {
  // ---- Trabajadores ----
  workers: Worker[] = [];
  newWorkerName = '';
  selectedWorker: Worker | null = null;
  workerBalance: WorkerBalanceRow[] = [];

  // ---- Buscador de productos (server-side) ----
  searchField: 'name' | 'id' | 'location' | 'category' = 'name';
  readonly searchFields: { value: string; label: string }[] = [
    { value: 'name', label: 'Nombre' },
    { value: 'id', label: 'ID' },
    { value: 'location', label: 'Ubicación' },
    { value: 'category', label: 'Categoría' },
  ];
  searchQuery = '';
  searchResults: Product[] = [];
  searching = false;

  // ---- Formulario de movimiento ----
  lines: MovementLine[] = [];
  detail = '';
  submitting = false;

  // ---- Historial paginado ----
  movementRows: WorkerMovementRow[] = [];
  movementTotal = 0;
  movementPage = 0;
  readonly pageSize = PAGE_SIZE;

  private searchTerms = new Subject<void>();
  private destroy$ = new Subject<void>();
  private searchSub?: Subscription;

  private readonly workersApi = inject(WorkersApiService);
  private readonly productsApi = inject(ProductsApiService);
  private readonly snackbar = inject(SnackbarService);

  ngOnInit(): void {
    this.loadWorkers();
    this.loadMovements();
    this.searchTerms.pipe(debounceTime(250)).subscribe(() => this.runSearch());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchSub?.unsubscribe();
  }

  // ---- Trabajadores ----

  loadWorkers(): void {
    this.workersApi.list().subscribe((workers) => (this.workers = workers ?? []));
  }

  createWorker(): void {
    const name = this.newWorkerName.trim();
    if (!name) return;
    this.workersApi.create(name).subscribe({
      next: () => {
        this.newWorkerName = '';
        this.snackbar.success('Trabajador creado');
        this.loadWorkers();
      },
      error: (err) => this.snackbar.error(err.error?.message || 'No se pudo crear el trabajador'),
    });
  }

  selectWorker(w: Worker): void {
    this.selectedWorker = this.selectedWorker?.id === w.id ? null : w;
    this.lines = [];
    this.workerBalance = [];
    if (this.selectedWorker) {
      this.workersApi.balance(w.id).subscribe((rows) => (this.workerBalance = rows));
    }
  }

  /** Saldo asignado actual de un producto para el trabajador activo. */
  assignedFor(productId: number): number {
    return this.workerBalance.find((b) => b.productId === productId)?.assigned ?? 0;
  }

  // ---- Líneas de movimiento ----

  onSearchChange(): void {
    this.searchTerms.next();
  }

  private runSearch(): void {
    const q = this.searchQuery.trim();
    if (!q || !this.selectedWorker) {
      this.searchResults = [];
      return;
    }
    this.searching = true;
    this.searchSub?.unsubscribe();
    this.searchSub = this.productsApi
      .searchProducts(q, this.searchField, 10)
      .subscribe({
        next: (res) => {
          this.searchResults = res.items;
          this.searching = false;
        },
        error: () => (this.searching = false),
      });
  }

  addLine(p: Product): void {
    if (p.id === undefined || this.lines.some((l) => l.productId === p.id)) return;
    this.lines.push({ productId: p.id, name: p.name, stock: p.stock ?? 0, quantity: 1 });
    this.searchResults = [];
    this.searchQuery = '';
  }

  removeLine(index: number): void {
    this.lines.splice(index, 1);
  }

  get hasNegative(): boolean {
    return this.lines.some((l) => (l.quantity ?? 0) < 0);
  }

  get canSubmit(): boolean {
    return (
      !!this.selectedWorker &&
      this.lines.length > 0 &&
      this.lines.every((l) => l.productId && l.quantity) &&
      !this.submitting
    );
  }

  submitMovements(): void {
    if (!this.selectedWorker || !this.canSubmit) return;
    this.submitting = true;
    this.workersApi
      .createMovements(
        this.selectedWorker.id,
        this.lines.map((l) => ({ productId: l.productId!, quantity: l.quantity! })),
        this.detail,
      )
      .subscribe({
        next: () => {
          this.submitting = false;
          this.snackbar.success('Movimiento registrado correctamente');
          this.lines = [];
          this.detail = '';
          this.movementPage = 0;
          this.loadMovements();
          if (this.selectedWorker) {
            this.workersApi.balance(this.selectedWorker.id).subscribe((rows) => (this.workerBalance = rows));
          }
        },
        error: (err) => {
          this.submitting = false;
          this.snackbar.error(err.error?.message || 'Error al registrar el movimiento');
        },
      });
  }

  // ---- Historial paginado ----

  loadMovements(): void {
    this.workersApi
      .movements(PAGE_SIZE, this.movementPage * PAGE_SIZE)
      .subscribe((page) => {
        this.movementRows = page.items;
        this.movementTotal = page.total;
      });
  }

  get movementMaxPage(): number {
    return Math.max(0, Math.ceil(this.movementTotal / this.pageSize) - 1);
  }

  goMovementPage(page: number): void {
    this.movementPage = Math.min(Math.max(page, 0), this.movementMaxPage);
    this.loadMovements();
  }

  shortDate(value: string): string {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '').replace('-', '');
    return `${day} ${month}`;
  }

  /** Detalle legible (sin el prefijo "Asignación de repuestos ·"). */
  detailLabel(row: WorkerMovementRow): string {
    return row.description
      .replace(/^(Asignación de repuestos|Devolución de repuestos)\s*·\s*/i, '')
      .trim() || '—';
  }
}
