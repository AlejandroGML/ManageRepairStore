import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { OrdenIngreso } from 'src/app/interface/ficha-tecnica';
import { ClientsApiService } from 'src/app/services/clients.api.service';
import { OrdersApiService } from 'src/app/services/orders.api.service';
import { Client } from 'src/app/interface/client';
import { ModalConfirmarComponent } from '../../shared/modal-confirmar/modal-confirmar.component';
import { MatDialog } from '@angular/material/dialog';
import { LoadingService } from 'src/app/services/loading.service';
import { ModalChoiceClientComponent } from '../modal-choice-client/modal-choice-client.component';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { PdfService } from 'src/app/services/pdf.service';
import { PdfComponent } from '../../shared/pdf/pdf.component';
import { NamePipe } from 'src/app/pipes/name.pipe';
import { RutPipe } from 'src/app/pipes/rut.pipe';
import { RutInputComponent } from '../../shared/rut-input/rut-input.component';
import { QrService } from 'src/app/services/qr.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS, PdfComponent, NamePipe, RutPipe, RutInputComponent],
})

export class RegisterComponent implements OnChanges{
  clients: Client[] = [];
  updatingUsers:boolean = false;
  readonly NOT_FOUND = -1;
  ordenIngreso!: OrdenIngreso;
  lastClientAdded: number = 0;
  form :FormGroup =  new FormGroup({
    name: new FormControl('', [Validators.required]),
    clientId:new FormControl(''),
    rut: new FormControl('', [Validators.required]),// this.rutService.validarRut.bind(this)]),
    address: new FormControl('', [Validators.required]),
    city: new FormControl('', [Validators.required]),
    phone: new FormControl('', [Validators.required]),
    email: new FormControl('',),
    has_company: new FormControl(false),
    company_name: new FormControl({value: '', disabled: true}),
    description: new FormControl('', [Validators.required]),
    observation: new FormControl('', [Validators.required]),
  });
  enablePDF:boolean = false;
  private readonly loadingService = inject(LoadingService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly ordersApi = inject(OrdersApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBarService = inject(SnackbarService);
  private readonly pdfService = inject(PdfService);
  private readonly qrService = inject(QrService);

  constructor() { 
    this.initData();
  }
  initData(){
    this.ordenIngreso = {
      name: '',
      rut: '',
      address: '',
      city: '',
      phone: '',
      email: '',
      description: '',
      observation: '',
      status: '',
    }
  }
  ngOnChanges(changes: SimpleChanges | any) {
    if(changes.users){
      this.clients=changes.users.currentValue;
    }
  }
  registerOrder(): void {
    this.form.markAllAsTouched();
    if(!this.form.valid)return;
    
    this.loadingService.setLoading(true);
    const { has_company, ...payload } = this.form.getRawValue();
    payload.status = 'Pendiente';
    // If has_company is false, company_name must be empty
    if (!has_company) {
      payload.company_name = '';
    }
    const value = payload as OrdenIngreso;
    if(!value.clientId)value.clientId=0;
    this.ordersApi.registerOrder(value).subscribe((clientAdded:Client)=>{
      if (!clientAdded.orders?.length) return;
      this.ordenIngreso.date = new Date(clientAdded.orders[0].date);
      const lastOrder = clientAdded.orders[clientAdded.orders.length - 1];
      this.ordenIngreso.code = (lastOrder as any).code ?? lastOrder.id;
      this.ordenIngreso.clientId = clientAdded.id;
      this.ordenIngreso.name = clientAdded.name;
      this.ordenIngreso.rut = clientAdded.rut_raw;
      this.ordenIngreso.city = clientAdded.city;
      this.ordenIngreso.phone = clientAdded.phone;
      this.ordenIngreso.address = clientAdded.address;
      this.ordenIngreso.description = clientAdded.orders[clientAdded.orders.length-1].description;
      this.ordenIngreso.observation = clientAdded.orders[clientAdded.orders.length-1].observation;
      this.ordenIngreso.date = clientAdded.orders[clientAdded.orders.length-1].date;
      this.ordenIngreso.status = clientAdded.orders[clientAdded.orders.length-1].status;
      this.ordenIngreso.company_name = clientAdded.company_name;
      this.enablePDF = true;
      this.clearForm(true,true);
      const ifilterByRut = this.clients.findIndex((user)=>clientAdded.rut_raw===user.rut_raw && user.name === clientAdded.name);
      if(ifilterByRut===this.NOT_FOUND){
        this.clients.unshift(clientAdded);
      }
      this.openConfirmModal();
      this.lastClientAdded = this.ordenIngreso.clientId || 0;
      this.loadingService.setLoading(false);
      // this.checkCacheData();
    },error=>{
      this.snackBarService.openSnackBar('Error. No fue posible conectarse con servidor');
      this.loadingService.setLoading(false);
    });
  }
  clearAllDataForm(){
    this.clearForm(true,true);
    const inputClientEl = document.getElementById('input-client');
    if (inputClientEl) inputClientEl.focus();
    this.ordenIngreso.code = 0;
    this.ordenIngreso.name = '';
    this.ordenIngreso.clientId = 0;
    this.ordenIngreso.date = undefined;
    this.enablePDF = false;
  }
  clearForm(clearRut:boolean,clearID?:boolean){
    this.form.setValue({
      name:'',
      address: '',
      city: '',
      phone: '',
      rut : clearRut? '' : this.form.get('rut')?.value,
      email: '',
      has_company: false,
      company_name: '',
      description: '',
      observation: '',
      clientId: clearID? '' : this.form.get('clientId')?.value
    })
    this.form.get('company_name')?.disable();
    this.lastClientAdded = 0;
    this.form.markAsUntouched();
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
  openConfirmModal(){
    this.dialog.open(ModalConfirmarComponent, {
      width: '90vw',
      maxWidth: '400px',
      maxHeight: '90vh',
      disableClose:true
    })
  }
  findByRut(){
    const rutFinded :string = String(this.form.get('rut')!.value).toLowerCase().trim().replace(/[.-]/g, '');//Obtener rut
    if(rutFinded.length<3)return;
    this.loadingService.setLoading(true);
    this.clientsApi.findUserByRut(rutFinded).subscribe({
      next: (users)=>{
        if(users.length === 0){
          this.snackBarService.openSnackBar('Sin resultados');
          this.clearForm(false,true);
        } else{
          const existingIds = new Set(this.clients.map(c => c.id));
          const newUsers = users.filter(u => !existingIds.has(u.id));
          this.clients.push(...newUsers);
          if(users.length===1){
            const hasCompany = !!users[0].company_name;
            this.form.setValue({
              "name":users[0].name,
              "rut": users[0].rut_raw,
              "email":users[0].email,
              "address":users[0].address,
              "city":users[0].city,
              "phone":users[0].phone,
              "clientId":users[0].id,
              "has_company": hasCompany,
              "company_name":users[0].company_name || '',
              "description":'',
              "observation":''
            });
            if (hasCompany) {
              this.form.get('company_name')?.enable();
            } else {
              this.form.get('company_name')?.disable();
            }
            const el = document.getElementById('id-description');
            if (el) el.focus();
          }else{
            this.openModalChoiceUser(rutFinded,users);
          }
        }
        this.loadingService.setLoading(false);
      },
      error: (err) => {
        console.error(err);
        this.loadingService.setLoading(false);
      }
    });
  }
  findByClientId(){
    const clientId = this.form.get('clientId')!.value;
    if(!this.esNumero(clientId)){
      this.snackBarService.openSnackBar('Debe ingresar un valor numerico');
      return;
    }
    this.loadingService.setLoading(true);
    let usersFiltered : Client[] = this.clients.filter(user => user.id == clientId);
    // Revisar si se cargaron los datos o no hay coincidencias
    if(usersFiltered.length===0){//No hay datos en la cache
      let valor = Number(clientId)
      this.clientsApi.findUserById(valor).subscribe({
        next: (user)=>{
          if(!user){
            this.snackBarService.openSnackBar('Sin resultados');
            this.clearForm(true,false);
            this.loadingService.setLoading(false);
            return;
          } else{
            this.clients.push(user);
            const hasCompany = !!user.company_name;
            this.form.setValue({
              "name":user.name,
              "rut": user.rut_raw,
              "email":user.email,
              "address":user.address,
              "city":user.city,
              "phone":user.phone,
              "has_company": hasCompany,
              "company_name":user.company_name || '',
              "description":'',
              "observation":'',
              "clientId":user.id
            });
            if (hasCompany) {
              this.form.get('company_name')?.enable();
            } else {
              this.form.get('company_name')?.disable();
            }
            const el = document.getElementById('id-description');
            if (el) el.focus();
          }
          this.loadingService.setLoading(false);
        },
        error: (err) => {
          console.error(err);
          this.loadingService.setLoading(false);
        }
      });
      return;
    }
    // Mostrar datos del usuario
    if(usersFiltered.length===1){
      const hasCompany = !!usersFiltered[0].company_name;
      this.form.setValue({
        "name":usersFiltered[0].name,
        "clientId":usersFiltered[0].id,
        "rut": usersFiltered[0].rut_raw,
        "email":usersFiltered[0].email,
        "address":usersFiltered[0].address,
        "city":usersFiltered[0].city,
        "phone":usersFiltered[0].phone,
        "has_company": hasCompany,
        "company_name":usersFiltered[0].company_name || '',
        "description":'',
        "observation":''
      })
      if (hasCompany) {
        this.form.get('company_name')?.enable();
      } else {
        this.form.get('company_name')?.disable();
      }
      this.loadingService.setLoading(false);
      const el = document.getElementById('id-description');
      if (el) el.focus();
      return;
    }
    this.loadingService.setLoading(false);
  }
  findByLastClient(){
    let clientAdded : Client[] = this.clients.filter(user => user.id == this.lastClientAdded);
    if (clientAdded.length === 0) return;
    const hasCompany = !!clientAdded[0].company_name;
    this.form.setValue({
      "name":clientAdded[0].name,
      "clientId":clientAdded[0].id,
      "rut": clientAdded[0].rut_raw,
      "email":clientAdded[0].email,
      "address":clientAdded[0].address,
      "city":clientAdded[0].city,
      "phone":clientAdded[0].phone,
      "has_company": hasCompany,
      "company_name":clientAdded[0].company_name || '',
      "description":'',
      "observation":''
    });
    if (hasCompany) {
      this.form.get('company_name')?.enable();
    } else {
      this.form.get('company_name')?.disable();
    }
    const descEl = document.getElementById('id-description');
    if (descEl) descEl.click();
  }
  downloadQR() {
    this.loadingService.setLoading(true);
    this.qrService.toCanvas(String(this.ordenIngreso.code), 240)
      .then((canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d');
        const text = String(this.ordenIngreso.code); // texto que desea agregar
        const font = '24px sans-serif'; // fuente de texto
        const textWidth = ctx!.measureText(text).width;
        const x = ((canvas.width - textWidth) / 2)-3; // centrar el texto horizontalmente
        const y = canvas.height - 4; // debajo del código QR
        ctx!.font = font;
        ctx!.fillStyle = '#000000'; // color del texto
        ctx!.fillText(text, x, y);
        const link = document.createElement('a');
        link.download = 'Qr_' + this.ordenIngreso.code;
        link.href = canvas.toDataURL('image/png');
        link.click();
        this.loadingService.setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        this.loadingService.setLoading(false);
      });
  }
  
  esNumero(valor: any): boolean {
    return !isNaN(valor);
  }
  openModalChoiceUser(rut:string,users:Client[]){
    this.dialog.open(ModalChoiceClientComponent, {
      width: '90vw',
      maxWidth: '600px',
      maxHeight: '90vh',
      disableClose:true,
      data:{users:users,rut:rut}
    }).afterClosed().subscribe((selected:Client)=>{
      this.form.get('rut')!.markAsUntouched();
      if(selected) {
        const hasCompany = !!selected.company_name;
        this.form.setValue({
          "clientId":selected.id,
          "name":selected.name,
          "rut": selected.rut_raw,
          "email":selected.email,
          "address":selected.address,
          "city":selected.city,
          "phone":selected.phone,
          "has_company": hasCompany,
          "company_name":selected.company_name || '',
          "description":'',
          "observation":''
        });
        if (hasCompany) {
          this.form.get('company_name')?.enable();
        } else {
          this.form.get('company_name')?.disable();
        }
      }
      const el = document.getElementById('id-description');
      if (el) el.focus();
    });
  }
  descargarPDF(){
    this.pdfService.generatePDFServer(this.ordenIngreso);
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
}
