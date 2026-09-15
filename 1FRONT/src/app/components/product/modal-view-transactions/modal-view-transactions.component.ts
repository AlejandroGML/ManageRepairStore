import { Component, Inject, OnInit, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Product } from 'src/app/interface/warehouse';
import { getApiUrl } from 'src/app/services/api-url';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
  selector: 'app-modal-view-transactions',
  templateUrl: './modal-view-transactions.component.html',
  standalone: true,
  imports: [SHARED_IMPORTS],
  styleUrls: ['./modal-view-transactions.component.css']
})
export class ModalViewTransactionsComponent implements OnInit {
  private readonly i18n = inject(I18nService);

  // Columnas obligatorias
  mandatoryColumns = ['id', 'createdAt', 'operation', 'quantity', 'finalStock'];

  // Columnas opcionales que pueden ser seleccionadas
  optionalColumns = [
    { value: 'location', labelKey: 'tx.colLocation' },
    { value: 'description', labelKey: 'common.description' },
    { value: 'costPrice', labelKey: 'tx.colCostPrice' },
    { value: 'sellingPrice', labelKey: 'tx.colSellingPrice' },
    { value: 'maxDiscount', labelKey: 'tx.colMaxDiscount' },
    { value: 'purchaseDiscount', labelKey: 'tx.colPurchaseDiscount' },
    { value: 'assignedWorker', labelKey: 'tx.colAssignedWorker' }
  ];

  // Columnas seleccionadas por el usuario
  selectedColumns: string[] = [];

  // Columnas visibles en la tabla
  displayedColumns: string[] = [];

  // Claves i18n de las etiquetas de las columnas obligatorias
  private readonly columnLabelKeys: Record<string, string> = {
    id: 'tx.colId',
    createdAt: 'common.date',
    operation: 'tx.colOperation',
    quantity: 'common.quantity',
    finalStock: 'tx.colFinalStock',
  };

  constructor(
    public dialogRef: MatDialogRef<ModalViewTransactionsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { product: Product, transactions: any[] }
  ) {}

  ngOnInit(): void {
    // Inicializa las columnas obligatorias como visibles
    this.updateDisplayedColumns();
  }

  close(): void {
    this.dialogRef.close();
  }

  // Actualiza las columnas visibles en la tabla según la selección del usuario
  updateDisplayedColumns(): void {
    this.displayedColumns = [...this.mandatoryColumns, ...this.selectedColumns];
  }

  /** Chips de columnas: estado y toggle. */
  isSelected(value: string): boolean {
    return this.selectedColumns.includes(value);
  }

  toggleColumn(value: string): void {
    this.selectedColumns = this.isSelected(value)
      ? this.selectedColumns.filter((c) => c !== value)
      : [...this.selectedColumns, value];
    this.updateDisplayedColumns();
  }

  // Obtiene el nombre legible de cada columna (obligatorias + opcionales)
  headerLabel(column: string): string {
    const key = this.columnLabelKeys[column];
    return key ? this.i18n.t(key) : this.getColumnLabel(column);
  }

  // Obtiene el nombre legible de una columna opcional
  getColumnLabel(column: string): string {
    const col = this.optionalColumns.find(opt => opt.value === column);
    return col ? this.i18n.t(col.labelKey) : column;
  }

  /** Valor de celda para columnas no-imagen: raíz o snapshot según la columna. */
  /**
   * La columna de la fila es la fuente de verdad (registra el valor AL
   * momento de la transacción). snapshotData queda solo como respaldo de
   * filas históricas hasta que la columna muera en la normalización.
   */
  cellValue(t: any, col: string): string {
    return t[col] ?? t.snapshotData?.[col] ?? this.i18n.t('tx.noData');
  }

  // Método para obtener la URL completa de la imagen
  getImageUrl(imagePath: string | null | undefined ): string {
    return imagePath ? `${getApiUrl()}/${imagePath.replace(/^\/+/, '')}` : '';
  }
}
