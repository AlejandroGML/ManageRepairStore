import { Component, Inject, OnInit } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ProductsApiService } from 'src/app/services/products.api.service';
import { getApiUrl } from 'src/app/services/api-url';
import { Product, Transaction } from 'src/app/interface/warehouse';
import { ModalProductExistsComponent } from '../modal-product-exists/modal-product-exists.component';

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
  /** true when opened in create mode (no product id) */
  isCreateMode: boolean;

  constructor(
    private productsApi: ProductsApiService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<ModalEditProductComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { product: Product }
  ) {
    this.isCreateMode = !this.data.product?.id;
    this.lastTransaction = this.isCreateMode
      ? undefined
      : this.data.product.transactions?.[this.data.product.transactions.length - 1];
    this.originalName = this.data.product?.name ?? '';

    // Inicialización del formulario
    this.form = new FormGroup({
      name: new FormControl(this.data.product?.name ?? '', Validators.required),
      quantity: new FormControl(0, Validators.required),
      costPrice: new FormControl(this.lastTransaction?.costPrice || 0, Validators.required),
      sellingPrice: new FormControl(this.lastTransaction?.sellingPrice || 0, Validators.required),
      location: new FormControl(this.lastTransaction?.location || '', Validators.required),
      maxDiscount: new FormControl(this.lastTransaction?.maxDiscount || 0),
      purchaseDiscount: new FormControl(this.lastTransaction?.purchaseDiscount || ''),
      description: new FormControl(this.lastTransaction?.description || ''),
      assignedWorker: new FormControl(''),
      payMethod: new FormControl(''),
      image: new FormControl(null)
    });

    this.imageUrl = this.getImageUrl(this.data.product?.image);
  }

  ngOnInit(): void {
    if (!this.isCreateMode) {
      this.form.patchValue({ name: this.data.product.name });
      this.imageUrl = this.getImageUrl(this.data.product.image);
    }
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
    const newName = (this.form.get('name')?.value ?? '').toString().trim().toLowerCase();

    // Duplicate check against the backend (create) or other products (edit)
    if (newName !== this.originalName.toLowerCase()) {
      this.productsApi.checkProductNameExists(newName).subscribe(exists => {
        if (exists) {
          this.dialog.open(ModalProductExistsComponent, { width: '400px' });
        } else {
          this.isCreateMode ? this.performCreate() : this.performUpdate(newName);
        }
      });
    } else {
      this.isCreateMode ? this.performCreate() : this.performUpdate();
    }
  }

  /** Create a brand-new product (replicates the old inline create flow). */
  performCreate(): void {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    const quantity = Number(v.quantity) || 0;
    const snapshotData = {
      name: v.name,
      image: v.image ? undefined : '',
      operation: 'Nuevo Producto',
      quantity,
      costPrice: Number(v.costPrice) || 0,
      sellingPrice: Number(v.sellingPrice) || 0,
      maxDiscount: Number(v.maxDiscount ?? 0),
      purchaseDiscount: Number(v.purchaseDiscount ?? 0),
      location: v.location || '',
      finalStock: quantity,
      payMethod: ' ',
      description: v.description || '',
    };

    const formData = new FormData();
    formData.append('name', v.name);
    formData.append('quantity', String(quantity));
    formData.append('costPrice', String(v.costPrice ?? 0));
    formData.append('sellingPrice', String(v.sellingPrice ?? 0));
    formData.append('maxDiscount', String(v.maxDiscount ?? 0));
    formData.append('purchaseDiscount', String(v.purchaseDiscount ?? 0));
    formData.append('location', v.location || '');
    formData.append('description', v.description || '');
    formData.append('snapshotData', JSON.stringify(snapshotData));

    if (v.image) {
      formData.append('image', v.image);
    }

    formData.append('transactions', JSON.stringify([
      {
        operation: 'Nuevo Producto',
        quantity,
        costPrice: v.costPrice ?? 0,
        sellingPrice: v.sellingPrice ?? 0,
        maxDiscount: v.maxDiscount ?? 0,
        location: v.location || '',
        finalStock: quantity,
        payMethod: ' ',
      },
    ]));

    this.productsApi.createProduct(formData).subscribe(() => {
      this.dialogRef.close('created');
    });
  }

  performUpdate(newName?: string): void {
    if (this.form.valid) {
      const snapshotData = {
        name: this.form.value.name,
        image: this.imageUrl?.replace(getApiUrl(),''),
        operation: 'Actualización Producto',
        quantity: Number(this.form.value.quantity) || 0,
        costPrice: Number(this.form.value.costPrice) || 0,
        sellingPrice: Number(this.form.value.sellingPrice) || 0,
        maxDiscount: Number(this.form.value.maxDiscount) || 0,
        purchaseDiscount: Number(this.form.value.purchaseDiscount) || 0,
        location: this.form.value.location || '',
        description: this.form.value.description || '',
      };

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
      formData.append('snapshotData', JSON.stringify(snapshotData)); // Agrega el snapshotData como JSON

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
