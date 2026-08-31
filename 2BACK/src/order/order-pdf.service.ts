import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import { OrderPdfDto } from '../dto/order-pdf.dto';

@Injectable()
export class OrderPdfService implements OnModuleDestroy {
  private readonly logger = new Logger(OrderPdfService.name);
  private logoBase64: string;
  /** Lazy singleton browser — launching Chromium per request is expensive */
  private browserPromise: Promise<puppeteer.Browser> | null = null;

  constructor() {
    this.loadLogo();
  }

  private getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: process.env.CHROME_BIN || undefined,
      }).catch((err) => {
        this.browserPromise = null; // reset on failure so next call retries
        throw err;
      });
    }
    return this.browserPromise;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browserPromise) {
      const browser = await this.browserPromise;
      await browser.close();
      this.browserPromise = null;
    }
  }

  async generateOrderPdf(data: OrderPdfDto): Promise<Buffer> {
    // Backward compat: old clients still send their own QR data URL;
    // otherwise generate it server-side from the order code.
    const qrDataUrl = data.qr || await QRCode.toDataURL(String(data.code), { width: 144, margin: 1 });
    const html = this.buildTemplate(data, qrDataUrl);
    const browser = await this.getBrowser();

    try {
      return await this.renderPdfPage(browser, html);
    } catch (err) {
      // Transient page failure (crashed renderer, timeout) — retry once with a fresh page
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(`PDF render failed, retrying once with a fresh page: ${reason}`);
      return await this.renderPdfPage(browser, html);
    }
  }

  private async renderPdfPage(browser: puppeteer.Browser, html: string): Promise<Buffer> {
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'load', timeout: 15000 });
      await page.emulateMediaType('screen');

      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
        printBackground: true,
        preferCSSPageSize: true,
      });

      return Buffer.from(pdf);
    } finally {
      // The browser singleton stays alive across requests; only the page is discarded
      await page.close().catch(() => undefined);
    }
  }

  private loadLogo(): void {
    try {
      const logoPath = process.env.LOGO_PATH
        || path.resolve(process.cwd(), '..', '1FRONT', 'src', 'assets', 'img', 'logo-300x80.png');
      const logoBuffer = fs.readFileSync(logoPath);
      this.logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch {
      this.logger.warn('Logo not found, PDF will render without logo');
      this.logoBase64 = '';
    }
  }

  private buildTemplate(data: OrderPdfDto, qrDataUrl?: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
    color: #000;
    padding: 12px;
    width: 100%;
  }
  .header { text-align: center; margin-bottom: 16px; }
  .header img { height: 56px; }
  .header div { font-size: 13px; line-height: 1.6; margin-top: 4px; }

  .info-box {
    border: 2px solid #000;
    display: flex;
    padding: 8px 0;
    width: 100%;
    margin-bottom: 12px;
    position: relative;
  }
  .info-left {
    width: 20%;
    border-right: 1px solid #000;
    padding-left: 8px;
    line-height: 2.1;
    font-weight: 600;
  }
  .info-right {
    width: 60%;
    padding-left: 12px;
    line-height: 2.1;
  }
  .info-qr {
    width: 20%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .info-qr img { width: 72px; height: 72px; }

  .section-title {
    border: 2px solid #000;
    border-bottom: none;
    text-align: center;
    font-weight: 600;
    padding: 4px;
    font-size: 14px;
  }
  .section-content {
    border: 2px solid #000;
    border-top: none;
    padding: 8px 12px;
    min-height: 48px;
    margin-bottom: 8px;
  }
  .section-content.last {
    border-bottom: 2px solid #000;
    margin-bottom: 16px;
  }

  .conditions {
    font-size: 12px;
    text-align: justify;
    margin-top: 12px;
  }
  .conditions strong { display: block; margin-bottom: 4px; }
  .conditions span { display: block; line-height: 1.5; }
  .indent { padding-left: 14px; }

  .signature {
    width: 50%;
    margin: 20px auto 0;
    border: 2px solid #000;
    height: 72px;
    text-align: center;
    padding-top: 24px;
    font-size: 15px;
  }
</style>
</head>
<body>
  <div class="header">
    ${this.logoBase64 ? `<img src="${this.logoBase64}" alt="Manage Repair Store" />` : '<div style="font-size:20px;font-weight:bold;">Manage Repair Store</div>'}
    <div>Av. Providencia 1234 - Providencia, Santiago</div>
    <div>Fono: +56 9 5555 1234</div>
    <div>Administracion@demo.example - www.demo.example</div>
  </div>

  <div class="info-box">
    <div class="info-left">
      <div>N°</div>
      <div>CLIENTE</div>
      <div>RUT</div>
      <div>DIRECCIÓN</div>
      <div>COMUNA</div>
      <div>TELÉFONO</div>
      <div>N° AVISO</div>
      <div>FECHA</div>
    </div>
    <div class="info-right">
      <div>${data.clientId}</div>
      <div style="font-weight:600;">${this.esc(data.name)}</div>
      <div>${this.esc(data.rut)}</div>
      <div>${this.esc(data.address)}</div>
      <div>${this.esc(data.city)}</div>
      <div>${this.esc(data.phone)}</div>
      <div>${data.code}</div>
      <div>${this.esc(data.date)}</div>
    </div>
    <div class="info-qr">
      ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" />` : ''}
    </div>
  </div>

  <div class="section-title">Problema a solucionar</div>

  <div class="section-title" style="border:2px solid #000; border-bottom:none; text-align:left; font-size:13px; padding:4px 12px;">DESCRIPCIÓN</div>
  <div class="section-content">${this.esc(data.description)}</div>

  <div class="section-title" style="border:2px solid #000; border-bottom:none; text-align:left; font-size:13px; padding:4px 12px;">OBSERVACIONES</div>
  <div class="section-content last">${this.esc(data.observation)}</div>

  <div class="conditions">
    <strong>Condiciones</strong>
    <span>1. Costo visita y presupuesto $20.000.</span>
    <span>2. Garantía entrega da por Comercial Demo SpA en reparación corresponde a 60 días.</span>
    <span>3. Los artefactos con garantía del fabricante quedan exentos del pago por costo de reparación.</span>
    <span>4. Artefactos de taller tienen como plazo máximo 30 días desde el día de aviso, de no venir a</span>
    <span class="indent">retirarlo el artefacto se envía a otra bodega con costo que deberá ser cancelado por el cliente.</span>
    <span>5. Queda convenido que Comercial Demo SpA no responde por mercadería en los casos de daños</span>
    <span class="indent">o pérdidas causadas por casos fortuitos o de fuerza mayor.</span>
    <span style="margin-top:8px;">6. Datos de transferencia:</span>
    <span class="indent">Titular: Manage Repair Store SpA</span>
    <span class="indent">Rut: 76.512.345-3</span>
    <span class="indent">Cuenta Corriente Banco Demo: 000-123-456-7</span>
    <span class="indent">Copia correo: contacto@demo.example</span>
  </div>

  <div class="signature">Conforme Cliente:</div>
</body>
</html>`;
  }

  /** Escape HTML special characters */
  private esc(value: string | number | undefined): string {
    if (value === undefined || value === null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
