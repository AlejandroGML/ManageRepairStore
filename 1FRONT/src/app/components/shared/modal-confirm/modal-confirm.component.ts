import { Component, Inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

/**
 * Data del diálogo de confirmación/notificación.
 *  - mode 'confirm' (default): Confirmar/Cancelar; cierra con `true` al aceptar.
 *  - mode 'notify': solo botón Aceptar (reemplaza los antiguos
 *    ModalConfirmar/ModalRefillSuccess y los modales usados como aviso).
 */
export interface ModalConfirmData {
  message: string;
  mode?: 'confirm' | 'notify';
  okLabel?: string;
  cancelLabel?: string;
  title?: string;
}

@Component({
  selector: 'app-modal-confirm',
  templateUrl: './modal-confirm.component.html',
  standalone: true,
  imports: [SHARED_IMPORTS],
  styleUrls: ['./modal-confirm.component.css']
})
export class ModalConfirmComponent {
  readonly mode: 'confirm' | 'notify';
  readonly okLabel: string;
  readonly cancelLabel: string;
  readonly title: string;

  constructor(
    public dialogRef: MatDialogRef<ModalConfirmComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ModalConfirmData
  ) {
    this.mode = data.mode ?? 'confirm';
    this.okLabel = data.okLabel ?? (this.mode === 'notify' ? 'Aceptar' : 'Confirmar');
    this.cancelLabel = data.cancelLabel ?? 'Cancelar';
    this.title = data.title ?? (this.mode === 'notify' ? 'Aviso' : 'Confirmar');
  }

  /** Confirmación: cierra con `true` para que el caller ejecute la acción. */
  confirm(): void {
    this.dialogRef.close(true);
  }

  /** Cancelación/cierre: cierra sin valor (falsy) — el caller NO ejecuta la acción. */
  close(): void {
    this.dialogRef.close();
  }
}
