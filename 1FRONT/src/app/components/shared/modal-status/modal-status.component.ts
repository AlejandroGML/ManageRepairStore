import { Component, Inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { AbstractControl, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Client, Order } from 'src/app/interface/client';
import { OrdersApiService } from 'src/app/services/orders.api.service';
import { LoadingService } from 'src/app/services/loading.service';

@Component({
  selector: 'app-modal-status',
  templateUrl: './modal-status.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule,
    MatSlideToggleModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatTabsModule, MatAutocompleteModule, MatSelectModule, MatProgressSpinnerModule, MatIconModule,
    MatTableModule, MatPaginatorModule, MatSnackBarModule, MatDialogModule, MatDividerModule,
    MatListModule, MatTooltipModule, MatButtonToggleModule],
  styleUrls: ['./modal-status.component.css']
})
export class ModalStatusComponent {
  order!:Order;
  form!:FormGroup;
  
  constructor(private ordersApi: OrdersApiService, private loadingService:LoadingService,
    private dialogRef: MatDialogRef<ModalStatusComponent>,@Inject(MAT_DIALOG_DATA) public data: Order,
    private _snackBar: MatSnackBar,private formBuilder: FormBuilder, private ngZone: NgZone) {
    this.order=data;
    this.form = this.formBuilder.group({
      status: [data.status!.charAt(0).toUpperCase()+ data.status!.slice(1),[Validators.required]],
      comment:['',[Validators.required]]
    });
  }

  changeStatus(){
    if(!this.form.get('comment')!.valid){
      this.form.get('comment')!.markAsTouched();
      return;
    }
    
    // Crear una copia del objeto para no mutar el original
    const updatedOrder: Order = { ...this.order };
    updatedOrder.status = this.form.value.status;
    updatedOrder.comment = this.form.value.comment;
    
    this.loadingService.setLoading(true);
    
    // Ejecutar la llamada fuera de Angular para evitar problemas de detección de cambios
    this.ngZone.runOutsideAngular(() => {
      this.ordersApi.updateStatus(updatedOrder).subscribe(
        (response: Order) => {
          this.ngZone.run(() => {
            this.loadingService.setLoading(false);
            this.dialogRef.close(response);
          });
        },
        error => {
          this.ngZone.run(() => {
            console.error(error);
            this.loadingService.setLoading(false);
            this.dialogRef.close(null);
          });
        }
      );
    });
  }

  obtenerMensajeError(control: AbstractControl) {
    if (control?.hasError('required')) {
      return 'Este campo es requerido';
   // } else if (control?.hasError('rutInvalido')) {
     // return 'El RUT ingresado no es válido';
    } else if (control?.hasError('email')) {
      return 'El correo electrónico ingresado no es válido';
    } else if (control?.hasError('pattern')) {
      return 'Este campo solo puede contener números';
    }
    return '';
  }

  close() {
    this.dialogRef.close();
  }

}
