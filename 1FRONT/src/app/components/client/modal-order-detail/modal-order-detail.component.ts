import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Client, Order } from 'src/app/interface/client';
import { ModalStatusComponent } from '../../shared/modal-status/modal-status.component';
import { NamePipe } from 'src/app/pipes/name.pipe';
import { RutPipe } from 'src/app/pipes/rut.pipe';
import { ModalService } from 'src/app/services/modal.service';
import { I18nService } from '../../../i18n/i18n.service';
import { TPipe } from '../../../i18n/t.pipe';

export interface OrderDetailData {
  client: Client;
  order: Order;
}

/**
 * Muestra los datos completos de una orden (cliente + estado + descripción) y
 * permite cambiar el estado desde acá mismo. Sustituye a tener que entrar a
 * "ver órdenes" para ver el detalle de una orden puntual.
 */
@Component({
  selector: 'app-modal-order-detail',
  templateUrl: './modal-order-detail.component.html',
  styleUrls: ['./modal-order-detail.component.css'],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatTooltipModule, NamePipe, RutPipe, TPipe],
})
export class ModalOrderDetailComponent {
  private readonly modal = inject(ModalService);
  private readonly i18n = inject(I18nService);
  private readonly dialogRef = inject<MatDialogRef<ModalOrderDetailComponent>>(MatDialogRef);

  client: Client;
  order: Order;
  /** true si el estado cambió dentro del modal (para que el finder recargue). */
  changed = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: OrderDetailData) {
    this.client = data.client;
    this.order = data.order;
  }

  statusBadgeClass(status?: string): string {
    switch ((status ?? '').toLowerCase()) {
      case 'entregado':
      case 'completado':
        return 'badge-success';
      case 'pendiente':
        return 'badge-warning';
      case 'cancelado':
        return 'badge-error';
      case 'en reparacion':
      case 'en reparación':
        return 'badge-neutral';
      default:
        return 'badge-neutral';
    }
  }

  statusLabel(status?: string): string {
    if (!status) return '—';
    return status === 'En reparacion' ? this.i18n.t('client.orders.statusInRepair') : status;
  }

  changeStatus(): void {
    const dialogRef = this.modal.open(ModalStatusComponent, {
      size: 'md',
      data: { ...this.order },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((updated: Order | null) => {
      if (updated) {
        this.order = { ...updated };
        this.changed = true;
      }
    });
  }

  close(): void {
    this.dialogRef.close({ changed: this.changed });
  }
}
