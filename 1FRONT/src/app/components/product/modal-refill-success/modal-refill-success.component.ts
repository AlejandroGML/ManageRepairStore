import { Component } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';

@Component({
  selector: 'app-modal-refill-success',
  templateUrl: './modal-refill-success.component.html',
  standalone: true,
  imports: [SHARED_IMPORTS],
  styleUrls: ['./modal-refill-success.component.css']
})
export class ModalRefillSuccessComponent {
  message: string = '¡La operación fue realizada exitosamente!';
}
