import { Component, OnInit, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CategoriesApiService, CategoryRow } from 'src/app/services/categories.api.service';
import { ModalConfirmComponent } from '../../shared/modal-confirm/modal-confirm.component';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { ModalService } from 'src/app/services/modal.service';

@Component({
  selector: 'app-modal-manage-categories',
  templateUrl: './modal-manage-categories.component.html',
  styleUrls: ['./modal-manage-categories.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS],
})
export class ModalManageCategoriesComponent implements OnInit {
  categories: CategoryRow[] = [];
  loading = true;
  saving = false;

  /** Alta: fila de creación visible. */
  adding = false;
  newName = '';

  /** Edición inline: id de la fila en edición. */
  editingId: number | null = null;
  editName = '';

  /** Al cerrar avisa al padre si hubo cambios (para recargar el catálogo). */
  private dirty = false;

  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly modal = inject(ModalService);
  private readonly snackbar = inject(SnackbarService);

  constructor(public dialogRef: MatDialogRef<ModalManageCategoriesComponent>) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.categoriesApi.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories ?? [];
        this.loading = false;
      },
      error: () => {
        this.snackbar.error('No se pudieron cargar las categorías');
        this.loading = false;
      },
    });
  }

  close(): void {
    this.dialogRef.close(this.dirty);
  }

  // --- Alta -----------------------------------------------------------

  startAdd(): void {
    this.adding = true;
    this.newName = '';
    this.editingId = null;
  }

  cancelAdd(): void {
    this.adding = false;
  }

  saveAdd(): void {
    const name = this.newName.trim();
    if (!name || this.saving) return;
    this.saving = true;
    this.categoriesApi.createCategory(name).subscribe({
      next: () => {
        this.saving = false;
        this.adding = false;
        this.dirty = true;
        this.snackbar.success('Categoría creada');
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.snackbar.error(err.error?.message || 'No se pudo crear la categoría');
      },
    });
  }

  // --- Edición inline ---------------------------------------------------

  startEdit(category: CategoryRow): void {
    this.editingId = category.id ?? null;
    this.editName = category.name;
    this.adding = false;
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  saveEdit(): void {
    const name = this.editName.trim();
    if (!name || this.editingId === null || this.saving) return;
    this.saving = true;
    this.categoriesApi.updateCategory(this.editingId, name).subscribe({
      next: () => {
        this.saving = false;
        this.editingId = null;
        this.dirty = true;
        this.snackbar.success('Categoría actualizada');
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.snackbar.error(err.error?.message || 'No se pudo actualizar la categoría');
      },
    });
  }

  // --- Eliminación ------------------------------------------------------

  confirmDelete(category: CategoryRow): void {
    // Con productos asociados el backend bloquea el borrado: avisar sin abrir
    // una confirmación que siempre fallaría.
    if ((category.productCount ?? 0) > 0) {
      this.snackbar.error(
        `"${category.name}" tiene ${category.productCount} producto(s) asociado(s). Reasígnalos primero.`,
      );
      return;
    }

    const dialogRef = this.modal.open(ModalConfirmComponent, {
      size: 'sm',
      data: { message: `¿Eliminar la categoría "${category.name}"?` },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed || !category.id) return;
      this.categoriesApi.deleteCategory(category.id).subscribe({
        next: () => {
          this.dirty = true;
          this.snackbar.success('Categoría eliminada');
          this.load();
        },
        error: (err) => {
          this.snackbar.error(err.error?.message || 'No se pudo eliminar la categoría');
        },
      });
    });
  }
}
