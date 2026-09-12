import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { OrderPdfDto } from '../dto/order-pdf.dto';
import { PdfBrowserService } from '../services/pdf-browser.service';

@Injectable()
export class OrderPdfService {
  private readonly logger = new Logger(OrderPdfService.name);

  constructor(private readonly pdf: PdfBrowserService) {}

  async generateOrderPdf(data: OrderPdfDto): Promise<Buffer> {
    // Backward compat: old clients still send their own QR data URL;
    // otherwise generate it server-side from the order code.
    const qrDataUrl = data.qr || await QRCode.toDataURL(String(data.code), { width: 144, margin: 1 });
    const html = this.buildTemplate(data, qrDataUrl);
    const browser = await this.pdf.getBrowser();

    try {
      return await this.renderPdfPage(browser, html);
    } catch (err) {
      // Transient page failure (crashed renderer, timeout) — retry once with a fresh page
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(`PDF render failed, retrying once with a fresh page: ${reason}`);
      return await this.renderPdfPage(browser, html);
    }
  }

  private async renderPdfPage(browser: any, html: string): Promise<Buffer> {
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

  /** Friendly status label for the chip (normalizes legacy values). */
  private statusLabel(status?: string): string {
    if (!status) return '';
    if (status.toLowerCase() === 'en reparacion') return 'En reparación';
    return status;
  }

  private buildTemplate(data: OrderPdfDto, qrDataUrl?: string): string {
    const logo = this.pdf.logo
      ? `<img src="${this.pdf.logo}" alt="Manage Repair Store">`
      : '<div style="font-size:22px;font-weight:700;color:#6D28D9;">MANAGE REPAIR STORE</div>';
    const status = data.status ? `<span class="status-chip">${this.esc(this.statusLabel(data.status))}</span>` : '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
${this.pdf.fontsCss}
  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --accent: #6D28D9;
    --accent-dark: #5B21B6;
    --accent-soft: #EDE9FE;
    --surface: #FFFFFF;
    --fg: #1F2937;
    --muted: #6B7280;
    --soft-fg: #4B5563;
    --border: #E5E7EB;
    --font-body: 'Fira Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    --font-mono: 'Fira Code', 'SFMono-Regular', Consolas, monospace;
  }

  body {
    font-family: var(--font-body);
    color: var(--fg);
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* PDF layout: A4 already carries the 8mm margins via Puppeteer; the sheet
     fills the content box (no screen shadow/card). min-height tuned so a
     typical ticket fits a single page; long descriptions still paginate. */
  .sheet {
    width: auto;
    min-height: 255mm;
    padding: 8mm 11mm 6mm;
    display: flex;
    flex-direction: column;
  }

  /* ---------- Header ---------- */
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 4mm;
    border-bottom: 2px solid var(--accent);
  }
  .doc-header img { height: 46px; display: block; }
  .doc-contact {
    text-align: right;
    font-size: 10.5px;
    line-height: 1.65;
    color: var(--muted);
  }
  .doc-contact strong { color: var(--fg); font-weight: 600; }

  /* ---------- Order code strip ---------- */
  .order-strip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8mm;
    padding: 4.5mm 0 4mm;
  }
  .order-eyebrow {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 1.5mm;
  }
  .order-code {
    font-family: var(--font-mono);
    font-size: 30px;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1;
  }
  .order-meta {
    margin-top: 2.5mm;
    font-size: 12px;
    color: var(--soft-fg);
  }
  .order-meta .sep { margin: 0 2.5mm; color: var(--border); }
  .mono { font-family: var(--font-mono); }

  .status-chip {
    display: inline-block;
    vertical-align: 6px;
    margin-left: 4mm;
    padding: 1.2mm 3.5mm 1.4mm;
    border-radius: 3px;
    background: var(--accent-soft);
    color: var(--accent-dark);
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .qr-block {
    flex-shrink: 0;
    padding: 2mm;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: #fff;
  }
  .qr-block img { width: 24mm; height: 24mm; display: block; }

  /* ---------- Sections ---------- */
  .sec-head {
    display: flex;
    align-items: center;
    gap: 2.5mm;
    margin: 4.5mm 0 3mm;
  }
  .sec-head::before {
    content: '';
    width: 6px;
    height: 6px;
    background: var(--accent);
    flex-shrink: 0;
  }
  .sec-head h2 {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--fg);
    white-space: nowrap;
  }
  .sec-head::after {
    content: '';
    height: 1px;
    background: var(--border);
    flex: 1;
  }

  /* Client data grid */
  .client-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    column-gap: 6mm;
    row-gap: 3.5mm;
  }
  .field span {
    display: block;
    font-size: 8.5px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 1mm;
  }
  .field p { font-size: 13px; line-height: 1.35; }
  .field.name p { font-size: 15px; font-weight: 600; }
  .f-name { grid-column: span 7; }
  .f-rut  { grid-column: span 5; }
  .f-addr { grid-column: span 7; }
  .f-city { grid-column: span 5; }
  .f-phone { grid-column: span 4; }
  .f-mail { grid-column: span 5; }
  .f-cid  { grid-column: span 3; }

  /* Problem blocks */
  .problem-block { padding: 2.5mm 0; border-top: 1px solid var(--border); }
  .problem-block:first-of-type { border-top: none; padding-top: 0; }
  .problem-block h3 {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 1.5mm;
  }
  .problem-block p { font-size: 13.5px; line-height: 1.55; color: var(--fg); white-space: pre-line; }

  /* Conditions */
  .conditions ol {
    list-style: none;
    counter-reset: cond;
    font-size: 10.5px;
    line-height: 1.55;
    color: var(--soft-fg);
  }
  .conditions li {
    counter-increment: cond;
    display: flex;
    gap: 2.5mm;
    padding: 0.8mm 0;
  }
  .conditions li::before {
    content: counter(cond) '.';
    font-family: var(--font-mono);
    font-size: 9.5px;
    color: var(--muted);
    flex-shrink: 0;
    width: 4.5mm;
    text-align: right;
  }

  .transfer-box {
    margin: 3mm 0 0 7mm;
    padding: 3mm 4mm;
    border: 1px solid var(--border);
    border-radius: 4px;
  }
  .transfer-box h3 {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--fg);
    margin-bottom: 1.5mm;
  }
  .transfer-box p {
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--soft-fg);
  }
  .transfer-box .mono {
    font-family: var(--font-mono);
    font-weight: 700;
    color: var(--fg);
    font-size: 11.5px;
  }

  /* Signature + footer */
  .signature {
    margin-top: auto;
    padding-top: 10mm;
    text-align: center;
  }
  .signature .line {
    width: 78mm;
    margin: 0 auto;
    border-top: 1px solid var(--fg);
    padding-top: 2mm;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--soft-fg);
  }

  .doc-footer {
    margin-top: 5mm;
    padding-top: 3mm;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: var(--muted);
  }
  .doc-footer .mono { font-family: var(--font-mono); }
</style>
</head>
<body>
  <div class="sheet">

    <header class="doc-header">
      ${logo}
      <div class="doc-contact">
        <strong>Av. Demo #1234 · Santiago</strong><br>
        Fono: +56 2 0000 0000<br>
        Administracion@demo.example · www.demo.example
      </div>
    </header>

    <section class="order-strip">
      <div>
        <div class="order-eyebrow">Orden de servicio · Ingreso a taller</div>
        <div class="order-code">${this.esc(data.code)}${status}</div>
        <div class="order-meta">
          Aviso N° <span class="mono">${this.esc(data.code)}</span> <span class="sep">|</span>
          Ingresada el ${this.esc(data.date)} <span class="sep">|</span>
          Cliente N° ${this.esc(data.clientId)}
        </div>
      </div>
      <div class="qr-block">
        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="Código QR de la orden">` : ''}
      </div>
    </section>

    <div class="sec-head"><h2>Datos del cliente</h2></div>
    <div class="client-grid">
      <div class="field name f-name"><span>Cliente</span><p>${this.esc(data.name)}</p></div>
      <div class="field f-rut"><span>RUT</span><p>${this.esc(data.rut)}</p></div>
      <div class="field f-addr"><span>Dirección</span><p>${this.esc(data.address)}</p></div>
      <div class="field f-city"><span>Comuna</span><p>${this.esc(data.city)}</p></div>
      <div class="field f-phone"><span>Teléfono</span><p>${this.esc(data.phone)}</p></div>
      <div class="field f-mail"><span>Email</span><p>${this.esc(data.email || '—')}</p></div>
      <div class="field f-cid"><span>N° Cliente</span><p>${this.esc(data.clientId)}</p></div>
    </div>

    <div class="sec-head"><h2>Problema a solucionar</h2></div>
    <div class="problem-block">
      <h3>Descripción</h3>
      <p>${this.esc(data.description) || '—'}</p>
    </div>
    <div class="problem-block">
      <h3>Observaciones</h3>
      <p>${this.esc(data.observation) || '—'}</p>
    </div>

    <div class="sec-head"><h2>Condiciones del servicio</h2></div>
    <div class="conditions">
      <ol>
        <li>Costo visita y presupuesto $20.000.</li>
        <li>Garantía entrega da por Comercial Demo SpA en reparación corresponde a 60 días.</li>
        <li>Los artefactos con garantía del fabricante quedan exentos del pago por costo de reparación.</li>
        <li>Artefactos de taller tienen como plazo máximo 30 días desde el día de aviso, de no venir a retirarlo el artefacto se envía a otra bodega con costo que deberá ser cancelado por el cliente.</li>
        <li>Queda convenido que Comercial Demo SpA no responde por mercadería en los casos de daños o pérdidas causadas por casos fortuitos o de fuerza mayor.</li>
      </ol>
      <div class="transfer-box">
        <h3>6 · Datos de transferencia</h3>
        <p>Titular: Manage Repair Store SpA — RUT 76.512.345-3<br>
        Cuenta Corriente Banco Demo: <span class="mono">000-123-456-7</span><br>
        Copia correo: contacto@demo.example</p>
      </div>
    </div>

    <div class="signature">
      <div class="line">Conforme cliente</div>
    </div>

    <footer class="doc-footer">
      <span>Manage Repair Store · www.demo.example</span>
      <span class="mono">Orden ${this.esc(data.code)}</span>
    </footer>

  </div>
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
