import { Component, Input, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { ClientsApiService } from 'src/app/services/clients.api.service';
import { OrdersApiService } from 'src/app/services/orders.api.service';
import { LoadingService } from 'src/app/services/loading.service';
import {MatTableDataSource} from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ModalOrdersComponent } from '../modal-orders/modal-orders.component';
import { MatDialog } from '@angular/material/dialog';
import { ModalEditClientComponent } from '../modal-edit-client/modal-edit-client.component';
import { ModalDeleteClientComponent } from '../modal-delete-client/modal-delete-client.component';
import { ModalConfirmComponent } from '../../shared/modal-confirm/modal-confirm.component';
import { Client } from 'src/app/interface/client';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { LengthFilterPipe } from 'src/app/pipes/length-filter.pipe';
import { NamePipe } from 'src/app/pipes/name.pipe';
import { RutPipe } from 'src/app/pipes/rut.pipe';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-finder',
  templateUrl: './finder.component.html',
  styleUrls: ['./finder.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS, LengthFilterPipe, NamePipe, RutPipe],
})
export class FinderComponent implements AfterViewInit {
  clients: Client[] = [];
  clientsFiltered: Client[]=[];
  filterOptions = [
    {value: 'code', viewValue: 'Número de aviso', placeHolder:'Ej: 1001'},
    {value: 'id', viewValue: 'N° Cliente', placeHolder:'70'},
    {value: 'rut', viewValue: 'Rut', placeHolder:'Ej: 12345678-k'},
    {value: 'name', viewValue: 'Nombre', placeHolder:'Ej: Comercial Demo SpA'},
    {value: 'address', viewValue: 'Dirección', placeHolder:'Ej: Av. Providencia 1234'},
  ];
  iFilterSelected:number = 0;
  filterSelected: 'code' | 'id' | 'rut' | 'name' | 'address'  = 'code';
  filterValue:string = '';
  displayedColumns: string[] = ['id','name', 'rut', 'phone', 'city', 'address', 'company_name', 'pdf','actions'];
  dataSource = new MatTableDataSource<Client>([]);
  showEmptyRow : boolean = false;
  /** Últimas órdenes de ingreso (todas las del sistema). */
  recentOrders: { id: number; clientName: string; status: string; date: string }[] = [];
  constructor(private clientsApi: ClientsApiService, private ordersApi: OrdersApiService, private loadingService: LoadingService,
    private dialog: MatDialog,private snackbarService: SnackbarService) {
    this.loadRecentOrders();
  }

  private loadRecentOrders(): void {
    this.ordersApi.getAllOrders().subscribe((clientsWithOrders) => {
      const flat = clientsWithOrders.flatMap((c) =>
        (c.orders ?? []).map((o) => ({
          id: o.id,
          clientName: c.name,
          status: o.status ?? 'Pendiente',
          date: o.date ? new Date(o.date).toLocaleDateString('es-CL') : '',
        })),
      );
      this.recentOrders = flat.slice(-6).reverse();
    });
  }

  /** Badge class por estado de orden (prototipo). */
  statusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'entregado':
      case 'completado':
        return 'badge-success';
      case 'pendiente':
        return 'badge-warning';
      case 'cancelado':
        return 'badge-error';
      default:
        return 'badge-neutral';
    }
  }

  ngAfterViewInit(){
    
  }

  selectOption() {
    this.filterValue = '';
    document.getElementById('input-filter')?.click();
    this.iFilterSelected = this.filterOptions.findIndex((opt:any) => opt.value === this.filterSelected);
    this.dataSource = new MatTableDataSource();
  }

  findClientData() {
    if(!this.filterValue || (this.filterSelected=='id' && isNaN(Number(this.filterValue)) == true) || 
    (this.filterSelected=='code' && isNaN(Number(this.filterValue)) == true)){
      this.snackbarService.openSnackBar('Es necesario ingresar un valor válido');
      return;
    }

    this.loadingService.setLoading(true);
    let findValue = this.filterValue;//Quitar puntos y guion al rut para comparar
    switch(this.filterSelected){
      case 'code'://N° de Orden
        this.ordersApi.findOrderByCode(this.filterValue).subscribe(data=>{
          if(!data){
            this.showEmptyRow = true;
            this.loadingService.setLoading(false);
            return;
          }
          this.dataSource = new MatTableDataSource([data] as Client[]);
          this.showEmptyRow = this.dataSource.data.length===0;
          this.openOrderModal(data);
          this.loadingService.setLoading(false);
        },(err)=>{
          this.loadingService.setLoading(false);
          this.snackbarService.openSnackBar('Error al buscar. Intente nuevamente.');
          });
        break;
      case 'id'://ID de Usuario
        if(isNaN(Number(this.filterValue)))return;
        this.clientsApi.findUserById(Number(this.filterValue)).subscribe(data=>{
          if(!data){
            this.showEmptyRow = true;
            this.loadingService.setLoading(false);
            return;
          }
          const user : Client[] = [];
          user.push(data);
          this.dataSource = new MatTableDataSource(user);
          this.showEmptyRow = this.dataSource.data.length===0;
          this.loadingService.setLoading(false);
        },(err)=>{
          this.loadingService.setLoading(false);
          this.snackbarService.openSnackBar('Error al buscar. Intente nuevamente.');
        });
        break;
      case 'rut'://RUT de Usuario
          this.clientsApi.findUserByRut(findValue.toLowerCase().replace(/[.-]/g, '').trim()).subscribe((users)=>{
          if(users)this.clientsFiltered = users;
          this.dataSource = new MatTableDataSource(this.clientsFiltered);
          this.showEmptyRow = this.dataSource.data.length===0;
          this.loadingService.setLoading(false);
        },(err)=>{
          this.loadingService.setLoading(false);
          this.snackbarService.openSnackBar('Error al buscar. Intente nuevamente.');
        });
      break;
      case 'name':
          this.clientsApi.findUserByName(findValue).subscribe((users)=>{
          if(users)this.clientsFiltered = users;
          
          this.dataSource = new MatTableDataSource(this.clientsFiltered);
          this.showEmptyRow = this.dataSource.data.length===0;
          this.loadingService.setLoading(false);
        },(err)=>{
          this.loadingService.setLoading(false);
          this.snackbarService.openSnackBar('Error al buscar. Intente nuevamente.');
        });
      break
      case 'address':
          this.clientsApi.findUserByAddress(findValue).subscribe((users)=>{
          if(users)this.clientsFiltered = users;
          if(users.length>200){
            this.snackbarService.openSnackBar('Demasiadas coincidencias. Cambiar dirección.');
            this.loadingService.setLoading(false);
            return;
          }
          this.dataSource = new MatTableDataSource(this.clientsFiltered);
          this.showEmptyRow = this.dataSource.data.length===0;
          this.loadingService.setLoading(false);
        },(err)=>{
          this.loadingService.setLoading(false);
          this.snackbarService.openSnackBar('Error al buscar. Intente nuevamente.');
        });
        break;
      default:
        this.dataSource.filter = '';
        break;
    }
  }
  applyFilter(event: Event) {
    let filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
  showOrderDetails(client:Client){
    this.loadingService.setLoading(true);
    this.ordersApi.findOrderByUser(client).subscribe((data)=>{
      this.openOrderModal(data);
      this.loadingService.setLoading(false);
    },error=>{
      this.loadingService.setLoading(false);
      this.snackbarService.openSnackBar('Error al buscar. Intente nuevamente.');
    });
  }
  showModalEditUser(client:Client):void{
    const copy = {...client};
    this.dialog.open(ModalEditClientComponent, {
      width: '90vw',
      maxWidth: '720px',
      maxHeight: '90vh',
      data:copy,
      disableClose:true
    }).afterClosed().subscribe((newClient:Client)=>{
      if(newClient){
        let index = this.dataSource.data.findIndex(u=>u.id===newClient.id);
        let indexU = this.clients.findIndex(u=>u.id===newClient.id);
        this.dataSource.data[index]=newClient;
        this.clients[indexU]=newClient;
        this.dataSource = new MatTableDataSource(this.dataSource.data);
      }
    });
  }
  showModalDeleteUser(client:Client):void{
    this.dialog.open(ModalDeleteClientComponent, {
      width: '90vw',
      maxWidth: '400px',
      maxHeight: '90vh',
      data:client,
      disableClose:true
    }).afterClosed().subscribe((id:number)=>{
      if(id){
        this.dataSource = new MatTableDataSource(this.dataSource.data.filter(u=>u.id!==client.id));
        this.dialog.open(ModalConfirmComponent,{
          width: '90vw',
          maxWidth: '400px',
          maxHeight: '90vh',
          data: {message: 'Cliente eliminado exitosamente'},
          disableClose:true
        });
      }
    });
  }
  openOrderModal(client:Client){
    this.dialog.open(ModalOrdersComponent, {
      width: '95vw',
      maxWidth: '1100px',
      maxHeight: '90vh',
      data:client,
      disableClose:true
    });
  }

  exportToExcel(): void {
    this.loadingService.setLoading(true);
    this.clientsApi.getAllClients().subscribe({
      next: (allClients) => {
        this.loadingService.setLoading(false);
        if (!allClients || allClients.length === 0) {
          this.snackbarService.openSnackBar('No hay clientes para exportar.');
          return;
        }

        const clientData = allClients.map((client) => ({
          'N°': client.id || '',
          'Nombre': client.name || '',
          'RUT': client.rut_raw || '',
          'Teléfono': client.phone || '',
          'Email': client.email || '',
          'Dirección': client.address || '',
          'Ciudad': client.city || '',
          'Empresa': client.company_name || 'Particular',
        }));

        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(clientData, { skipHeader: false });
        const workbook: XLSX.WorkBook = { Sheets: { 'Clientes': worksheet }, SheetNames: ['Clientes'] };

        XLSX.writeFile(workbook, 'Lista_de_Clientes.xlsx');
        this.snackbarService.openSnackBar(`Exportados ${clientData.length} clientes`);
      },
      error: () => {
        this.loadingService.setLoading(false);
        this.snackbarService.openSnackBar('Error al obtener clientes. Intente nuevamente.');
      }
    });
  }
}
