import { Component, Inject, OnInit } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { getApiUrl } from 'src/app/services/api-url';
import { Product } from 'src/app/interface/warehouse';
import { ImageModalComponent } from '../../shared/image-modal/image-modal.component';
import { ModalEditProductComponent } from '../modal-edit-product/modal-edit-product.component';
import { ModalViewTransactionsComponent } from '../modal-view-transactions/modal-view-transactions.component';
import { DataSyncService } from 'src/app/services/data-sync.service'; // Importa el servicio

@Component({
  selector: 'app-modal-search-results',
  templateUrl: './modal-search-results.component.html',
  standalone: true,
  imports: [SHARED_IMPORTS],
  styleUrls: ['./modal-search-results.component.css']
})
export class ModalSearchResultsComponent implements OnInit {
  displayedColumns: string[] = ['id', 'image', 'name', 'stock', 'location', 'sellingPrice', 'transaction', 'edit'];
  products: Product[] = [];

  constructor(
    public dialogRef: MatDialogRef<ModalSearchResultsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { products: Product[] },
    private productsApi: ProductsApiService,
    private dialog: MatDialog,
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
    this.dialog.open(ImageModalComponent, {
      width: '85%',
      data: { imageUrl: imageUrl || 'assets/no-image-available.png' }
    });
  }

  // Abre el modal de transacciones del producto
  openTransactionModal(product: Product): void {
    if (product.id !== undefined) {
      this.productsApi.getProductTransactions(product.id).subscribe(transactions => {
        this.dialog.open(ModalViewTransactionsComponent, {
          width: '70%',
          data: { product, transactions }
        });
      });
    } else {
      console.error("El ID del producto es indefinido");
    }
  }

  // Abre el modal para editar el producto
  openEditProductModal(product: Product): void {
    const dialogRef = this.dialog.open(ModalEditProductComponent, {
      width: '60%',
      data: { product }
    });

    dialogRef.afterClosed().subscribe(result => {
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
