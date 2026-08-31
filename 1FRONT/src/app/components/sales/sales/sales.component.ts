import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MatDialog } from '@angular/material/dialog';
import { Product } from 'src/app/interface/warehouse';
import { SalesApiService } from 'src/app/services/sales.api.service';
import { AuthService } from 'src/app/services/auth.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { MatTableDataSource } from '@angular/material/table';
import { ProductSearchModalComponent } from '../../product/product-search-modal/product-search-modal.component';
import { DataSyncService } from 'src/app/services/data-sync.service';
import { Subscription } from 'rxjs';
import jsPDF from 'jspdf';

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
  displayedColumns: string[] = ['name', 'sellingPrice', 'quantity', 'purchaseDiscount', 'finalValue', 'delete'];
  dataSource = new MatTableDataSource<SaleProduct>();
  totalSaleValue: number = 0;
  submitting = false;
  get userLogged(): any { return this.authService.getCurrentUser(); }

  private readonly salesApi = inject(SalesApiService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly dataSyncService = inject(DataSyncService);
  private readonly snackbar = inject(SnackbarService);
  private readonly saleSubscriptions = new Subscription();

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.saleSubscriptions.unsubscribe();
  }

  openProductSearch(): void {
    const addedProductIds = this.dataSource.data.map(item => item.id);
    const dialogRef = this.dialog.open(ProductSearchModalComponent, {
      width: '70%',
      data: { addedProductIds }
    });

    dialogRef.afterClosed().subscribe((selectedProduct: Product) => {
      if (selectedProduct) {
        this.addProductToSale(selectedProduct);
      }
    });
  }

  addProductToSale(product: Product): void {
    // Use transactions[0] consistently (first = most recent if DESC ordering)
    const lastTransaction = product.transactions ? product.transactions[0] : null;

    const saleProduct: SaleProduct = {
        ...product,
        quantity: 1,
        sellingPrice: lastTransaction ? lastTransaction.sellingPrice ?? 0 : 0,
        purchaseDiscount: 0,
        maxDiscount: lastTransaction?.maxDiscount ?? 0,
    };

    // Compute finalValue with proper formula: sellingPrice * quantity - purchaseDiscount
    saleProduct.finalValue = (saleProduct.sellingPrice ?? 0) * saleProduct.quantity - saleProduct.purchaseDiscount;

    this.dataSource.data = [...this.dataSource.data, saleProduct];
    this.updateTotalSaleValue();
}

adjustQuantity(index: number, quantity: number): void {
    const product = this.dataSource.data[index];
    product.quantity = quantity;
    product.finalValue = (product.sellingPrice ?? 0) * product.quantity - product.purchaseDiscount;
    this.updateTotalSaleValue();
}

updateTotalSaleValue(): void {
    this.totalSaleValue = this.dataSource.data.reduce((sum: number, item: SaleProduct) => sum + (item.finalValue ?? 0), 0);
}

  

applyDiscount(index: number, discount: number): void {
  const product = this.dataSource.data[index];
  
  // Cap discount to maxDiscount
  product.purchaseDiscount = discount > (product.maxDiscount ?? 0) ? (product.maxDiscount ?? 0) : discount;

  // Recalculate finalValue
  product.finalValue = (product.sellingPrice ?? 0) * product.quantity - product.purchaseDiscount;
  
  // Force Angular change detection by replacing the dataSource reference
  this.dataSource.data = [...this.dataSource.data];
  this.updateTotalSaleValue();
}

  generatePDF(): void {
    const doc = new jsPDF();
    doc.text("Detalle de Venta", 10, 10);
    let yOffset = 20;

    this.dataSource.data.forEach((item: SaleProduct, index: number) => {
      const lastTransaction = item.transactions ? item.transactions[0] : null;
      doc.text(`${index + 1}. Producto: ${item.name}`, 10, yOffset);
      doc.text(`   Precio: ${lastTransaction ? lastTransaction.sellingPrice : 0}`, 10, yOffset + 10);
      doc.text(`   Cantidad: ${item.quantity}`, 10, yOffset + 20);
      doc.text(`   Descuento: ${item.purchaseDiscount}`, 10, yOffset + 30);
      doc.text(`   Valor Total: ${item.finalValue}`, 10, yOffset + 40);
      yOffset += 50;
    });

    doc.text(`Valor Total de Venta: ${this.totalSaleValue}`, 10, yOffset);
    doc.save('detalle_venta.pdf');
  }

  removeProductFromSale(index: number): void {
    const data = this.dataSource.data;
    data.splice(index, 1);
    this.dataSource.data = [...data];
    this.updateTotalSaleValue();
  }

  completeSale(): void {
    if (this.submitting) return;
    if (this.dataSource.data.length === 0) return;
    this.submitting = true;

    const batchProducts = this.dataSource.data.map(product => ({
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
        next: (sale) => {
          this.dataSource.data = [];
          this.totalSaleValue = 0;
          this.submitting = false;
          this.snackbar.success('Venta realizada correctamente');
          this.dataSyncService.notifyTransactionUpdate();
        },
        error: (err) => {
          this.submitting = false;
          this.snackbar.error(err.error?.message || 'Error al realizar la venta');
        }
      })
    );
  }
}