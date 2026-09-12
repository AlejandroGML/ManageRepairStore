import { Component, Inject, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import {  Client, Order } from 'src/app/interface/client';
import { PdfService } from 'src/app/services/pdf.service';
import { OrdenIngreso } from 'src/app/interface/ficha-tecnica';
import { ModalStatusComponent } from '../../shared/modal-status/modal-status.component';
import { PdfComponent } from '../../shared/pdf/pdf.component';
import { NamePipe } from 'src/app/pipes/name.pipe';
import { ModalService } from 'src/app/services/modal.service';

@Component({
  selector: 'app-modal-orders',
  templateUrl: './modal-orders.component.html',
  styleUrls: ['./modal-orders.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS, PdfComponent, NamePipe],
})
export class ModalOrdersComponent {
  private readonly modal = inject(ModalService);
  client!:Client;
  ordenIngreso!: OrdenIngreso;
  displayedColumns: string[] = ['id','date','status','comment', 'description', 'obs', 'changeStatus','actions'];
  dataSource = new MatTableDataSource<Order>([]);
  constructor(private dialogRef: MatDialogRef<ModalOrdersComponent>, @Inject(MAT_DIALOG_DATA) public data: Client,
    private pdfService: PdfService) {
    this.client=data;
    this.dataSource=new MatTableDataSource<Order>(data.orders);
    this.ordenIngreso = {
      name :  data.name,
      clientId:data.id,
      rut :  data.rut_raw,
      address :  data.address,
      city :  data.city,
      phone :data.phone,
      code :data.code,
      date: new Date(),
      email :  data.email,
      description:'',
      observation:'',
      status : 'Pendiente',
    }
  }
  descargarPDF(client:Client){
    const order = this.client.orders!.filter(o=>o.id === client.id)[0];
    this.ordenIngreso.description = order.description;
    this.ordenIngreso.observation = order.observation;
    this.ordenIngreso.phone = this.client.phone;
    this.ordenIngreso.code = order.id;
    this.ordenIngreso.date = order.date;

    // QR is generated server-side from the order code
    this.pdfService.generatePDFServer(this.ordenIngreso);
  }

  openStatusModal(order: Order) {
    const dialogRef = this.modal.open(ModalStatusComponent, {
      size: 'md',
      maxHeight: 'auto',
      data: order,
      disableClose: true
    });

    // Escuchar cuando el modal se cierre y capturar el resultado actualizado
    dialogRef.afterClosed().subscribe((result: Order | null) => {
      if (result) {
        // Buscar y reemplazar la orden en el datasource
        const index = this.dataSource.data.findIndex(o => o.id === result.id);
        if (index >= 0) {
          this.dataSource.data[index] = result;
          // Forzar actualización de la tabla
          this.dataSource.data = [...this.dataSource.data];
        }
      }
    });
  }

  close() {
    this.dialogRef.close();
  }

  /** Badge tone per order status (same mapping as the register screen). */
  statusBadgeClass(status?: string): string {
    switch ((status ?? '').toLowerCase()) {
      case 'entregado':
      case 'completado':
        return 'badge-success';
      case 'en reparacion':
      case 'en reparación':
        return 'badge-neutral';
      case 'cancelado':
        return 'badge-error';
      case 'pendiente':
      default:
        return 'badge-warning';
    }
  }

  statusLabel(status?: string): string {
    if (!status) return '—';
    return status === 'En reparacion' ? 'En reparación' : status;
  }
}
