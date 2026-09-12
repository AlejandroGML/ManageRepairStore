import { Component, Inject, OnInit, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { getApiUrl } from 'src/app/services/api-url';
import { Product } from 'src/app/interface/warehouse';
import { ImageModalComponent } from '../../shared/image-modal/image-modal.component';
import { ModalEditProductComponent } from '../modal-edit-product/modal-edit-product.component';
import { ModalViewTransactionsComponent } from '../modal-view-transactions/modal-view-transactions.component';
import { DataSyncService } from 'src/app/services/data-sync.service'; // Importa el servicio
import { ModalService } from 'src/app/services/modal.service';

@Component({
  selector: 'app-modal-search-results',
  templateUrl: './modal-search-results.component.html',
  standalone: true,
  imports: [SHARED_IMPORTS],
  styleUrls: ['./modal-search-results.component.css']
})
export class ModalSearchResultsComponent implements OnInit {
  private readonly modal = inject(ModalService);
  displayedColumns: string[] = ['id', 'image', 'name', 'stock', 'location', 'sellingPrice', 'transaction', 'edit'];
  products: Product[] = [];

  constructor(
    public dialogRef: MatDialogRef<ModalSearchResultsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { products: Product[] },
    private productsApi: ProductsApiService,
    private dataSyncService: DataSyncService // Inyecta el servicio
  ) {}

  ngOnInit(): void {
    this.loadProductsWithLastTransaction(this.data.products);
  }

  // Procesa cada producto para obtener la última transacción
  loadProductsWithLastTransaction(products: Product[]): void {
    this.products = products.map(product => {
      const lastTransaction = product.transactions ? product.transactions[product.transactions.length - 1] : null;
      return {
        ...product,
        costPrice: lastTransaction ? lastTransaction.costPrice : 0,
        sellingPrice: lastTransaction ? lastTransaction.sellingPrice : 0,
        location: lastTransaction ? lastTransaction.location : 'N/A'
      };
    });
  }

  // Método para obtener la URL completa de la imagen
  getImageUrl(imagePath: string | null): string {
    return imagePath ? `${getApiUrl()}/${imagePath.replace(/^\/+/, '')}` : '';
  }

  // Abre el modal de imagen
  openImageModal(imageUrl?: string): void {
    this.modal.open(ImageModalComponent, {
      size: 'full',
      data: { imageUrl: imageUrl || 'assets/img/no-image-available.png' }
    });
  }

  // Abre el modal de transacciones del producto
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
      console.error("El ID del producto es indefinido");
    }
  }

  // Abre el modal para editar el producto
  openEditProductModal(product: Product): void {
    const dialogRef = this.modal.open(ModalEditProductComponent, {
      size: 'lg',
      data: { product }
    });

    dialogRef.afterClosed().subscribe((result: unknown) => {
      if (result === 'updated') {
        this.dialogRef.close('updated');  // Notifica que hubo una actualización
        this.dataSyncService.notifyTransactionUpdate(); // Notifica actualización al cerrar el modal de edición
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
