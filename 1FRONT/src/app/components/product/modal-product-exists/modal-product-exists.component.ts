import { Component } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-modal-product-exists',
  templateUrl: './modal-product-exists.component.html',
  standalone: true,
  imports: [SHARED_IMPORTS],
  styleUrls: ['./modal-product-exists.component.css']
})
export class ModalProductExistsComponent {
  constructor(public dialogRef: MatDialogRef<ModalProductExistsComponent>) {}

  close(): void {
    this.dialogRef.close();
  }
}
