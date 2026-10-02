import { Component, OnInit, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { NamePipe } from 'src/app/pipes/name.pipe';
import { CompaniesApiService, CompanyRow } from 'src/app/services/companies.api.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { I18nService } from '../../../i18n/i18n.service';

/**
 * Modal "Gestionar empresas" (spec companies): tabla paginada (10/página)
 * con nombre + cantidad de sucursales y UNA acción: renombrar. Sin eliminar.
 * Al cerrar devuelve los renombres hechos para que el registro actualice la
 * empresa elegida si corresponde. Portado de ABAGAS.
 */
@Component({
  selector: 'app-modal-companies',
  templateUrl: './modal-companies.component.html',
  styleUrls: ['./modal-companies.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS, NamePipe],
})
export class ModalCompaniesComponent implements OnInit {
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly snackbar = inject(SnackbarService);
  private readonly dialogRef = inject(MatDialogRef<ModalCompaniesComponent>);
  private readonly i18n = inject(I18nService);

  rows: CompanyRow[] = [];
  total = 0;
  page = 1;
  readonly limit = 10;
  loading = false;
  editingId: number | null = null;
  readonly editName = new FormControl('');
  private readonly renamed = new Map<number, string>();

  ngOnInit(): void {
    this.load();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  load(): void {
    this.loading = true;
    this.companiesApi.list(this.page, this.limit).subscribe({
      next: (res) => {
        this.rows = res.items ?? [];
        this.total = res.total ?? 0;
        this.loading = false;
      },
      error: () => {
        this.rows = [];
        this.total = 0;
        this.loading = false;
        this.snackbar.openSnackBar(this.i18n.t('companies.loadError'));
      },
    });
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.load();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.load();
    }
  }

  startEdit(row: CompanyRow): void {
    this.editingId = row.id ?? null;
    this.editName.setValue(row.name.trim());
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editName.setValue('');
  }

  saveEdit(row: CompanyRow): void {
    const name = String(this.editName.value ?? '').trim();
    if (!name || row.id == null) return;
    this.companiesApi.rename(row.id, name).subscribe({
      next: (updated) => {
        row.name = updated?.name ?? name;
        this.renamed.set(row.id!, row.name);
        this.editingId = null;
        this.snackbar.success(this.i18n.t('companies.renamed'));
      },
      error: (err) => {
        // S1 (post-JD): mensaje real del servidor (p. ej. el 409 de nombre duplicado).
        const msg = err?.error?.message ?? this.i18n.t('companies.renameError');
        this.snackbar.openSnackBar(Array.isArray(msg) ? msg.join(', ') : String(msg));
      },
    });
  }

  close(): void {
    this.dialogRef.close(
      Array.from(this.renamed.entries()).map(([id, name]) => ({ id, name })),
    );
  }
}