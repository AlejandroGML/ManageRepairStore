import { Component, Inject, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Client } from 'src/app/interface/client';
import { ClientsApiService } from 'src/app/services/clients.api.service';
import { LoadingService } from 'src/app/services/loading.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { RutPipe } from 'src/app/pipes/rut.pipe';
import { RutInputComponent } from '../../shared/rut-input/rut-input.component';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
  selector: 'app-modal-edit-client',
  templateUrl: './modal-edit-client.component.html',
  standalone: true,
  imports: [SHARED_IMPORTS, RutPipe, RutInputComponent],
  styleUrls: ['./modal-edit-client.component.css']
})
export class ModalEditClientComponent {
  private readonly i18n = inject(I18nService);
  form :FormGroup =  new FormGroup({
    id:new FormControl(),
    name: new FormControl('', [Validators.required]),
    rut: new FormControl('', [Validators.required]),
    address: new FormControl('', [Validators.required]),
    city: new FormControl('', [Validators.required]),
    phone: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.email]),
    has_company: new FormControl(false),
    company_name: new FormControl({value: '', disabled: true}),
    active: new FormControl('', [Validators.required])
  });
  constructor(private dialogRef: MatDialogRef<ModalEditClientComponent>,@Inject(MAT_DIALOG_DATA) public data: Client,
    private clientsApi:ClientsApiService, private loadingService:LoadingService, private snackbarService:SnackbarService) {
    const hasCompany = !!data.company_name;
    this.form.setValue({
      id: data.id,
      name: data.name,
      rut: data.rut_raw,
      address: data.address,
      city: data.city,
      phone: data.phone,
      email: data.email,
      has_company: hasCompany,
      company_name: data.company_name || '',
      active: data.active !== undefined ? data.active : true
    } as any);
    if (hasCompany) {
      this.form.get('company_name')?.enable();
    }
  }
  hasCompanyChanged(checked: boolean): void {
    const branchControl = this.form.get('company_name');
    if (checked) {
      branchControl?.enable();
      if (!branchControl?.value) {
        branchControl?.setValue('Principal');
      }
    } else {
      branchControl?.setValue('');
      branchControl?.disable();
    }
  }
  saveClient(){
    this.form.markAllAsTouched();
    if(!this.form.valid)return;
    this.loadingService.setLoading(true);
    const rawValue = this.form.getRawValue();
    const user: Client = {
      id: rawValue.id,
      name: rawValue.name,
      rut_raw: rawValue.rut,
      address: rawValue.address,
      city: rawValue.city,
      phone: rawValue.phone,
      email: rawValue.email,
      company_name: rawValue.has_company ? rawValue.company_name : '',
      code: this.data.code,
    };
    setTimeout(()=>{
      this.clientsApi.updateUser(user).subscribe((updatedClient:Client)=>{
        this.loadingService.setLoading(false);
        this.dialogRef.close(updatedClient);
      },error =>{
        this.loadingService.setLoading(false);
        this.snackbarService.openSnackBar(this.i18n.t('client.edit.updateError'));
        this.dialogRef.close(null);
      })
    })
  }
  close() {
    this.dialogRef.close(null);
  }

  obtenerMensajeError(control: AbstractControl) {
    if (control?.hasError('required')) {
      return this.i18n.t('client.edit.required');
   } else if (control?.hasError('rutInvalido')) {
     return this.i18n.t('client.edit.rutInvalid');
    } else if (control?.hasError('email')) {
      return this.i18n.t('client.edit.emailInvalid');
    } else if (control?.hasError('pattern')) {
    }
    return '';
  }
}
