import { Component, Inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { QrService } from 'src/app/services/qr.service';
import { Product } from 'src/app/interface/warehouse';

/**
 * QR de identificación de producto: codifica MRS|PROD|{id}|{nombre}
 * para escaneo/impresión de etiquetas en bodega.
 */
@Component({
  selector: 'app-modal-product-qr',
  templateUrl: './modal-product-qr.component.html',
  styleUrls: ['./modal-product-qr.component.css'],
  standalone: true,
  imports: [SHARED_IMPORTS],
})
export class ModalProductQrComponent implements OnInit {
  @ViewChild('qrHost', { static: true }) qrHost!: ElementRef<HTMLDivElement>;
  qrData = '';
  productName = '';

  constructor(
    public dialogRef: MatDialogRef<ModalProductQrComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { product: Product },
    private readonly qrService: QrService
  ) {}

  ngOnInit(): void {
    const p = this.data.product;
    this.productName = p.name ?? '';
    this.qrData = `MRS|PROD|${p.id ?? ''}|${this.productName}`;
    this.qrService.toCanvas(this.qrData, 240).then((canvas) => {
      this.qrHost.nativeElement.replaceChildren(canvas);
    });
  }

  /** Descarga el QR como PNG (para etiquetas). */
  download(): void {
    this.qrService.toDataURL(this.qrData, 480).then((url) => {
      const a = document.createElement('a');
      a.download = `product-qr-${this.data.product.id ?? 'new'}.png`;
      a.href = url;
      a.click();
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}