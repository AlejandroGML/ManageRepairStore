import { Injectable } from '@angular/core';
import * as QRCode from 'qrcode';

@Injectable({ providedIn: 'root' })
export class QrService {
  toDataURL(data: string, width = 120): Promise<string> {
    return QRCode.toDataURL(data, {
      type: 'image/png',
      width,
      errorCorrectionLevel: 'H',
    });
  }

  toCanvas(data: string, width = 240): Promise<HTMLCanvasElement> {
    return QRCode.toCanvas(data, { width, errorCorrectionLevel: 'H' });
  }
}
