import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { AuthService } from 'src/app/services/auth.service';
import { getApiUrl } from 'src/app/services/api-url';
import { Product } from 'src/app/interface/warehouse';
import { ModalConfirmComponent } from '../../shared/modal-confirm/modal-confirm.component';
import { MatPaginator } from '@angular/material/paginator';
import { ImageModalComponent } from '../../shared/image-modal/image-modal.component';
import { ModalEditProductComponent } from '../modal-edit-product/modal-edit-product.component';
import { ModalViewTransactionsComponent } from '../modal-view-transactions/modal-view-transactions.component';
import { ModalProductExistsComponent } from '../modal-product-exists/modal-product-exists.component';
import { ModalSearchResultsComponent } from '../modal-search-results/modal-search-results.component';
import { DataSyncService } from 'src/app/services/data-sync.service';
import * as XLSX from 'xlsx';
import { QrService } from 'src/app/services/qr.service';
import { LoadingService } from 'src/app/services/loading.service';
import { SnackbarService } from 'src/app/services/snackbar.service';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS],
})
export class ProductComponent implements OnInit {
  private readonly authService = inject(AuthService);

  get userLogged(): any { return this.authService.getCurrentUser(); }

  form: FormGroup;
  searchForm: FormGroup;
  dataSource = new MatTableDataSource<Product>(); // Tabla principal
  displayedColumns: string[] = ['id', 'image', 'name', 'stock', 'location', 'sellingPrice', 'transaction', 'edit' , 'download'];

  @ViewChild(MatPaginator) paginator1!: MatPaginator;

  // Variables para búsqueda
  searchCriteria: string = 'id';
  searchValue: string = '';
  selectedPlaceholder: string = 'Buscar por ID';
  searchOptions = [
    { value: 'id', viewValue: 'ID del Producto', placeHolder: 'Buscar por ID' },
    { value: 'name', viewValue: 'Nombre del Producto', placeHolder: 'Buscar por Nombre' },
    { value: 'location', viewValue: 'Localización', placeHolder: 'Buscar por Localización' }
  ];

  constructor(private productsApi: ProductsApiService, private dialog: MatDialog, private dataSyncService: DataSyncService, private qrService: QrService, private loadingService: LoadingService, private snackbarService: SnackbarService) {
    this.form = new FormGroup({
      name: new FormControl('', Validators.required),
      quantity: new FormControl('', Validators.required),
      costPrice: new FormControl('', Validators.required),
      sellingPrice: new FormControl('', Validators.required),
      maxDiscount: new FormControl(''),
      location: new FormControl('', Validators.required),
      description: new FormControl(''),
      image: new FormControl(null)
    });

    this.searchForm = new FormGroup({
      id: new FormControl(''),
      name: new FormControl(''),
      location: new FormControl('')
    });
  }

  downloadProductQR(product: Product): void {
    if (!product.id) return;
    this.loadingService.setLoading(true);
    const price = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(product.sellingPrice || 0);
    const data = `ID: ${product.id}, Nombre: ${product.name}, Valor: ${price}, Ubicación: ${product.location}`;
    this.qrService.toCanvas(data, 240).then((canvas) => {
      const link = document.createElement('a');
      link.download = `producto_${product.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      this.loadingService.setLoading(false);
    }).catch((err) => {
      console.error('Error al generar el QR del producto', err);
      this.loadingService.setLoading(false);
      this.snackbarService.openSnackBar('Error al generar QR del producto');
    });
  }

   // Método para exportar datos a Excel
   exportToExcel(): void {
    const productData = this.dataSource.data.map((product) => {
      // Obtén la transacción más reciente del producto
      const lastTransaction = product.transactions ? product.transactions[product.transactions.length - 1] : null;
      
      return {
        ID: product.id,
        Nombre: product.name,
        Stock: product.stock ?? 0,
        Localización: product.location,
        'Valor de Venta': lastTransaction ? 
          new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(lastTransaction.sellingPrice ?? 0) : 'CLP 0'
      };
    });

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(productData, { skipHeader: false });
    const workbook: XLSX.WorkBook = { Sheets: { 'Productos': worksheet }, SheetNames: ['Productos'] };

    XLSX.writeFile(workbook, 'Lista_de_Productos.xlsx');
  }

  ngOnInit(): void {
    this.loadProductsWithLastTransaction();
    this.dataSource.paginator = this.paginator1;
    // Escucha las notificaciones de actualización de transacción
    this.dataSyncService.transactionUpdated$.subscribe(() => {
      this.loadProductsWithLastTransaction(); // Recarga los productos
    });
  }

  loadProductsWithLastTransaction(): void {
    this.productsApi.getProductsWithLastTransaction().subscribe((products: Product[]) => {
      this.dataSource.data = products.map(product => {
        const lastTransaction = product.transactions ? product.transactions[product.transactions.length - 1] : null;
        return {
          ...product,
          costPrice: lastTransaction ? lastTransaction.costPrice : 0,
          sellingPrice: lastTransaction ? lastTransaction.sellingPrice : 0,
          maxDiscount: lastTransaction ? lastTransaction.maxDiscount : 0,
          purchaseDiscount: lastTransaction ? lastTransaction.purchaseDiscount : 0,
          location: lastTransaction ? lastTransaction.location : 'Sin Datos',
          stock: product.stock ?? (lastTransaction ? lastTransaction.finalStock : 0), // Prefer server-side stock, fallback to lastTransaction
        };
      });

      // Asigna el paginador después de cargar los datos
      this.dataSource.paginator = this.paginator1;
    });
  }

  // Método para obtener la URL completa de la imagen
  getImageUrl(imagePath: string | null): string {
    return imagePath ? `${getApiUrl()}/${imagePath.replace(/^\/+/, '')}` : '';
  }

  openImageModal(imageUrl?: string): void {
    this.dialog.open(ImageModalComponent, {
      width: '85%',
      data: { imageUrl: imageUrl || 'assets/no-image-available.png' }
    });
  }

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

  openEditProductModal(product: Product): void {
    const dialogRef = this.dialog.open(ModalEditProductComponent, {
      width: '60%',
      data: { product }
    });

    // Recargar productos después de actualizar un producto
    dialogRef.afterClosed().subscribe(result => {
      if (result === 'updated') {
        this.loadProductsWithLastTransaction();
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      const file = input.files[0];
      this.form.patchValue({ image: file });
      this.form.get('image')?.updateValueAndValidity();
    }
  }

  addProduct(): void {
    if (!this.form.valid) {
      this.showValidationErrors();
      return;
    }
  
    const productName = this.form.value.name.trim().toLowerCase();
    const productExists = this.dataSource.data.some(product => product.name.toLowerCase() === productName);
  
    if (productExists) {
      this.dialog.open(ModalProductExistsComponent, {
        width: '300px'
      });
      return;
    }
  
    const snapshotData = {
      name: this.form.value.name,
      image: this.form.value.image,
      operation: 'Nuevo Producto',
      quantity: Number(this.form.value.quantity) || 0,
      costPrice: Number(this.form.value.costPrice) || 0,
      sellingPrice: Number(this.form.value.sellingPrice) || 0,
      maxDiscount: Number(this.form.value.maxDiscount ?? 0),
      purchaseDiscount: Number(this.form.value.purchaseDiscount ?? 0),
      location: this.form.value.location || '',
      finalStock: Number(this.form.value.quantity) || 0,
      payMethod: ' ',
      description: this.form.value.description || '',
    };
  
    const formData = new FormData();
    formData.append('name', this.form.value.name);
    formData.append('quantity', (this.form.value.quantity ?? 0).toString());
    formData.append('costPrice', (this.form.value.costPrice ?? 0).toString());
    formData.append('sellingPrice', (this.form.value.sellingPrice ?? 0).toString());
    formData.append('maxDiscount', (this.form.value.maxDiscount ?? 0).toString());
    formData.append('purchaseDiscount', (this.form.value.purchaseDiscount ?? 0).toString());
    formData.append('location', this.form.value.location || '');
    formData.append('description', this.form.value.description || '');
    formData.append('snapshotData', JSON.stringify(snapshotData));
  
    if (this.form.value.image) {
      formData.append('image', this.form.value.image);
    }
  
    formData.append('transactions', JSON.stringify([
      {
        operation: 'Nuevo Producto',
        quantity: this.form.value.quantity ?? 0,
        costPrice: this.form.value.costPrice ?? 0,
        sellingPrice: this.form.value.sellingPrice ?? 0,
        maxDiscount: this.form.value.maxDiscount ?? 0,
        location: this.form.value.location || '',
        finalStock: this.form.value.quantity ?? 0,
        payMethod: ' '
      }
    ]));
  
    this.productsApi.createProduct(formData).subscribe(() => {
      this.loadProductsWithLastTransaction();
      this.form.reset();
      this.openConfirmModal("Producto agregado correctamente");
    });
  }
  

  private showValidationErrors(): void {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  onSelectOption(): void {
    const selectedOption = this.searchOptions.find(option => option.value === this.searchCriteria);
    this.selectedPlaceholder = selectedOption?.placeHolder || 'Buscar';
  }

  performSearch(): void {
    if (this.searchCriteria === 'id' && this.searchValue) {
      const id = parseInt(this.searchValue, 10);
      this.productsApi.searchProductById(id).subscribe(
        product => {
          if (product) {
            this.dialog.open(ModalSearchResultsComponent, {
              width: '70%',
              data: { products: [product] } // Se envuelve en un array para consistencia
            });
          } else {
            this.openConfirmModal("No se encontró ningún producto con este ID.");
          }
        },
        () => this.openConfirmModal("Error al buscar por ID.")
      );
    } else if (this.searchCriteria === 'name' && this.searchValue) {
      this.productsApi.searchProductsByName(this.searchValue).subscribe(
        products => {
          if (products.length > 0) {
            this.dialog.open(ModalSearchResultsComponent, {
              width: '70%',
              data: { products }
            });
          } else {
            this.openConfirmModal("No se encontraron productos con este nombre.");
          }
        },
        () => this.openConfirmModal("Error al buscar por nombre.")
      );
    } else if (this.searchCriteria === 'location' && this.searchValue) {
      this.productsApi.searchProductsByLocation(this.searchValue).subscribe(
        products => {
          if (products.length > 0) {
            this.dialog.open(ModalSearchResultsComponent, {
              width: '70%',
              data: { products }
            });
          } else {
            this.openConfirmModal("No se encontraron productos en esta ubicación.");
          }
        },
        () => this.openConfirmModal("Error al buscar por ubicación.")
      );
    } else {
      this.openConfirmModal("Por favor, ingrese un valor de búsqueda válido.");
    }
  }

  clearSearch(): void {
    this.searchValue = '';
  }

  openConfirmModal(message: string): void {
    this.dialog.open(ModalConfirmComponent, {
      data: { message }
    });
  }
}
