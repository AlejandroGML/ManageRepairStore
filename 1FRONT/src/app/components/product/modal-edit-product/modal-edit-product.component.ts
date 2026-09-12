import { Component, Inject, OnInit } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { getApiUrl } from 'src/app/services/api-url';
import { Product, Transaction } from 'src/app/interface/warehouse';
import { ModalProductExistsComponent } from '../modal-product-exists/modal-product-exists.component';
import { ModalService } from 'src/app/services/modal.service';

@Component({
  selector: 'app-modal-edit-product',
  templateUrl: './modal-edit-product.component.html',
  standalone: true,
  imports: [SHARED_IMPORTS],
  styleUrls: ['./modal-edit-product.component.css']
})
export class ModalEditProductComponent implements OnInit {
  form: FormGroup;
  imageUrl: string | null = null;
  lastTransaction: Transaction | undefined;
  originalName: string;
  isNew: boolean;
  categories: { id: number; name: string }[] = [];

  constructor(
    private productsApi: ProductsApiService,
    private modal: ModalService,
    public dialogRef: MatDialogRef<ModalEditProductComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { product: Product; categories?: { id: number; name: string }[] }
  ) {
    this.isNew = !this.data.product.id;
    this.categories = data.categories ?? [];
    this.lastTransaction = this.data.product.transactions?.[this.data.product.transactions.length - 1];
    this.originalName = this.data.product.name;

    // Inicialización del formulario
    this.form = new FormGroup({
      name: new FormControl(this.data.product.name, Validators.required),
      quantity: new FormControl(0, Validators.required),
      costPrice: new FormControl(this.lastTransaction?.costPrice || 0, Validators.required),
      sellingPrice: new FormControl(this.lastTransaction?.sellingPrice || 0, Validators.required),
      location: new FormControl(this.lastTransaction?.location || '', Validators.required),
      maxDiscount: new FormControl(this.lastTransaction?.maxDiscount || 0),
      purchaseDiscount: new FormControl(this.lastTransaction?.purchaseDiscount || ''),
      description: new FormControl(this.lastTransaction?.description || ''),
      payMethod: new FormControl(''),
      categoryId: new FormControl(this.data.product.category?.id ?? ''),
      image: new FormControl(null)
    });

    this.imageUrl = this.getImageUrl(this.data.product.image);
  }

  ngOnInit(): void {
    // Patch completo desde el producto (columnas propias): antes solo se
    // parcheaba el nombre y los precios venían de la última transacción,
    // que podía ser una venta con valores vacíos.
    this.form.patchValue({
      name: this.data.product.name,
      categoryId: this.data.product.category?.id ?? '',
      minimum: this.data.product.minimum ?? 0,
      costPrice: this.data.product.costPrice ?? 0,
      sellingPrice: this.data.product.sellingPrice ?? 0,
      maxDiscount: this.data.product.maxDiscount ?? 0,
      location: this.data.product.location ?? '',
      description: this.data.product.description ?? '',
    });
    this.imageUrl = this.getImageUrl(this.data.product.image);
  }
  
  

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      const file = input.files[0];
      this.form.patchValue({ image: file });
      this.form.get('image')?.updateValueAndValidity();
      this.imageUrl = URL.createObjectURL(file);
    }
  }

  saveChanges(): void {
    if (this.isNew) {
      this.createProduct();
      return;
    }

    const newName = this.form.get('name')?.value;

    // Si el nombre cambió, verificar que no exista en otro producto
    if (newName !== this.originalName) {
      this.productsApi.checkProductNameExists(newName).subscribe(exists => {
        if (exists) {
          this.modal.open(ModalProductExistsComponent, { size: 'sm', disableClose: true });
        } else {
          this.performUpdate(newName);
        }
      });
    } else {
      this.performUpdate();
    }
  }

  /** Alta de producto nuevo: POST /product con la transacción inicial 'Nuevo Producto'. */
  private createProduct(): void {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    const formData = new FormData();
    formData.append('name', this.form.get('name')?.value);
    const categoryId = this.form.get('categoryId')?.value;
    if (categoryId) formData.append('categoryId', String(categoryId));
    if (this.form.get('image')?.value) {
      formData.append('image', this.form.get('image')?.value);
    }
    // Transacción inicial: 'Nuevo Producto' con quantity = stock inicial
    formData.append(
      'transactions',
      JSON.stringify([
        {
          operation: 'Nuevo Producto',
          quantity: Number(this.form.get('quantity')?.value) || 0,
          costPrice: Number(this.form.get('costPrice')?.value) || 0,
          sellingPrice: Number(this.form.get('sellingPrice')?.value) || 0,
          location: this.form.get('location')?.value || 'Sin Datos',
          maxDiscount: Number(this.form.get('maxDiscount')?.value) || 0,
          purchaseDiscount: Number(this.form.get('purchaseDiscount')?.value) || 0,
          description: this.form.get('description')?.value || '',
        },
      ])
    );

    this.productsApi.createProduct(formData).subscribe({
      next: () => this.dialogRef.close('created'),
      error: (err) => {
        this.dialogRef.close(null);
        console.error(err);
      },
    });
  }

  performUpdate(newName?: string): void {
    if (this.form.valid) {
      const formData = new FormData();
      formData.append('name', newName || this.originalName);
      formData.append('operation', 'Actualización Producto');
      formData.append('quantity', this.form.get('quantity')?.value);
      formData.append('costPrice', this.form.get('costPrice')?.value);
      formData.append('sellingPrice', this.form.get('sellingPrice')?.value);
      formData.append('location', this.form.get('location')?.value);
      formData.append('maxDiscount', this.form.get('maxDiscount')?.value || '');
      formData.append('purchaseDiscount', this.form.get('purchaseDiscount')?.value || '');
      formData.append('description', this.form.get('description')?.value || '');
      formData.append('assignedWorker', this.form.get('assignedWorker')?.value || '');
      formData.append('payMethod', this.form.get('payMethod')?.value || '');
        const categoryId = this.form.get('categoryId')?.value;
      if (categoryId) formData.append('categoryId', String(categoryId));

      if (this.form.get('image')?.value) {
        formData.append('image', this.form.get('image')?.value);
      }

      this.productsApi.createProductTransaction(this.data.product.id!, formData).subscribe(() => {
        this.dialogRef.close('updated');
      });
    } else {
      this.form.markAllAsTouched();
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  getImageUrl(imagePath: string | null | undefined): string {
    return imagePath ? `${getApiUrl()}/${imagePath.replace(/^\/+/, '')}` : '';
  }
}
