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

  constructor(
    private productsApi: ProductsApiService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<ModalEditProductComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { product: Product }
  ) {
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
      assignedWorker: new FormControl(''),
      payMethod: new FormControl(''),
      image: new FormControl(null)
    });

    this.imageUrl = this.getImageUrl(this.data.product.image);
  }

  ngOnInit(): void {
    this.form.patchValue({ name: this.data.product.name });
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
    const newName = this.form.get('name')?.value;

    // Si el nombre cambió, verificar que no exista en otro producto
    if (newName !== this.originalName) {
      this.productsApi.checkProductNameExists(newName).subscribe(exists => {
        if (exists) {
          this.dialog.open(ModalProductExistsComponent, { width: '400px' });
        } else {
          this.performUpdate(newName);
        }
      });
    } else {
      this.performUpdate();
    }
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
