import { Component } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-modal-confirmar',
  templateUrl: './modal-confirmar.component.html',
  standalone: true,
  imports: [SHARED_IMPORTS],
  styleUrls: ['./modal-confirmar.component.css']
})
export class ModalConfirmarComponent {
  constructor(private dialogRef: MatDialogRef<ModalConfirmarComponent>) {
  }
  close() {
    this.dialogRef.close();
  }
}
