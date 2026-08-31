import { Component, Inject, OnInit } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Product } from 'src/app/interface/warehouse';
import { getApiUrl } from 'src/app/services/api-url';

@Component({
  selector: 'app-modal-view-transactions',
  templateUrl: './modal-view-transactions.component.html',
  standalone: true,
  imports: [SHARED_IMPORTS],
  styleUrls: ['./modal-view-transactions.component.css']
})
export class ModalViewTransactionsComponent implements OnInit {
  // Columnas obligatorias
  mandatoryColumns = ['id', 'createdAt', 'operation', 'image', 'name', 'quantity', 'finalStock'];

  // Columnas opcionales que pueden ser seleccionadas
  optionalColumns = [
    { value: 'location', label: 'Localización' },
    { value: 'description', label: 'Descripción' },
    { value: 'costPrice', label: 'Precio de Costo' },
    { value: 'sellingPrice', label: 'Precio de Venta' },
    { value: 'maxDiscount', label: 'Descuento Máximo' },
    { value: 'purchaseDiscount', label: 'Descuento de Compra' },
    { value: 'finalValue', label: 'Valor Final' },
    { value: 'assignedWorker', label: 'Trabajador Asignado' }
  ];

  // Columnas seleccionadas por el usuario
  selectedColumns: string[] = [];

  // Columnas visibles en la tabla
  displayedColumns: string[] = [];

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

  // Obtiene el nombre legible de cada columna
  getColumnLabel(column: string): string {
    const col = this.optionalColumns.find(opt => opt.value === column);
    return col ? col.label : column;
  }

  // Método para obtener la URL completa de la imagen
  getImageUrl(imagePath: string | null | undefined ): string {
    return imagePath ? `${getApiUrl()}/${imagePath.replace(/^\/+/, '')}` : '';
  }
}
