import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { OrdenIngreso } from '../interface/ficha-tecnica';
import { getApiUrl } from './api-url';

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = getApiUrl();

  /** Generate PDF via backend (Puppeteer) — fast, high-quality.
   *  QR is generated server-side from the order code. */
  generatePDFServer(order: OrdenIngreso): void {
    this.http.post(`${this.apiUrl}/order/pdf`, {
      clientId: order.clientId,
      code: order.code,
      name: order.name,
      rut: order.rut,
      address: order.address,
      city: order.city,
      phone: order.phone,
      email: order.email,
      date: order.date,
      description: order.description,
      observation: order.observation,
      status: order.status,
    }, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Orden_${order.code}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('PDF: server generation failed', err);
      }
    });
  }

  /** Legacy client-side PDF (html2canvas + jsPDF) — kept as fallback */
  generatePDF(order: OrdenIngreso, qrDataUrl?: string, retry = true): void {
    const pdfImg = document.getElementById('pdf-page');
    if (!pdfImg) {
      if (retry) {
        setTimeout(() => this.generatePDF(order, qrDataUrl, false), 200);
        return;
      }
      console.warn('PDF: element #pdf-page not found in DOM');
      return;
    }

    // Set QR code image directly to avoid waiting for Angular change detection
    if (qrDataUrl) {
      const qrImg = pdfImg.querySelector('img[alt="Código QR"]') as HTMLImageElement;
      if (qrImg) {
        qrImg.src = qrDataUrl;
      }
    }

    html2canvas(pdfImg, {
      scale: 1,           // 1x instead of default 2x (devicePixelRatio) → 4x fewer pixels → ~4x faster
      logging: false,     // skip console logging
      backgroundColor: '#ffffff',
      useCORS: true,      // allow cross-origin images (logo)
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF.default({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      pdf.addImage(imgData, 'PNG', 0, 0, 208, 260);
      pdf.save('Orden_'+order.code+'.pdf');
    }).catch(err => {
      console.error('PDF: html2canvas failed', err);
    });
  }
}