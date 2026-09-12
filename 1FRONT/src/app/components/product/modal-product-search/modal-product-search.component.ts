import { Component, Inject, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl } from '@angular/forms';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { Product, Transaction } from 'src/app/interface/warehouse';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-modal-product-search',
  templateUrl: './modal-product-search.component.html',
  standalone: true,
  imports: [SHARED_IMPORTS],
  styleUrls: ['./modal-product-search.component.css']
})
export class ModalProductSearchComponent implements OnInit, AfterViewInit {
  searchControl = new FormControl('');
  products: Product[] = [];
  displayedColumns: string[] = ['id', 'name', 'stock', 'sellingPrice', 'select'];
  filterType: string = 'id';
  addedProductIds: number[];
  dataSource = new MatTableDataSource<Product>(); // Usar MatTableDataSource para la tabla

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private productsApi: ProductsApiService,
    public dialogRef: MatDialogRef<ModalProductSearchComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.addedProductIds = data.addedProductIds || [];
  }

  ngOnInit(): void {
    this.searchControl.valueChanges.subscribe(value => {
      this.performSearch(value || '');
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator; // Conectar el paginador después de inicializar la vista
  }

  performSearch(value: string): void {
    if (this.filterType === 'id') {
      const id = parseInt(value, 10);
      if (!isNaN(id)) {
        this.productsApi.searchProductById(id).subscribe(
          (product: Product) => {
            this.products = product ? [product] : [];
            this.applyFilter();
          },
          () => {
            this.products = [];
            this.applyFilter();
          }
        );
      }
    } else if (this.filterType === 'name') {
      this.productsApi.searchProductsByName(value).subscribe(
        (products: Product[]) => {
          this.products = products;
          this.applyFilter();
        },
        () => {
          this.products = [];
          this.applyFilter();
        }
      );
    }
  }

  private applyFilter(): void {
    const filteredProducts = this.products.filter(
      product => !this.addedProductIds.includes(product.id || 0)
    );
    this.dataSource.data = filteredProducts; // Asignar los productos filtrados a la fuente de datos de la tabla
  }

  isOutOfStock(product: Product): boolean {
    return (product.stock ?? 0) === 0;
  }

  selectProduct(product: Product): void {
    if (!this.isOutOfStock(product)) {
      this.dialogRef.close(product);
    }
  }

  changeFilterType(type: string): void {
    this.filterType = type;
    this.products = [];
    this.dataSource.data = []; // Limpiar la fuente de datos
    this.searchControl.setValue('');
  }

  close(): void {
    this.dialogRef.close();
  }

  public getLastTransaction(product: Product): Transaction | null {
    return product.transactions && product.transactions.length > 0
      ? product.transactions[product.transactions.length - 1]
      : null;
  }
}
