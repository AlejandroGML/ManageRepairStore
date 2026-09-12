import { Injectable, Logger } from '@nestjs/common';
import { SalePdfDto, SalePdfItem } from './dto/sale-pdf.dto';
import { PdfBrowserService } from '../services/pdf-browser.service';

/**
 * Comprobante de venta con el mismo lenguaje visual que la orden de servicio:
 * logo, header de contacto, tira de código, tipografías Fira y tokens de marca.
 * Se genera server-side (Puppeteer) desde el resumen del carrito.
 */
@Injectable()
export class SalePdfService {
  private readonly logger = new Logger(SalePdfService.name);

  constructor(private readonly pdf: PdfBrowserService) {}

  async generateSalePdf(data: SalePdfDto): Promise<Buffer> {
    const html = this.buildTemplate(data);
    const browser = await this.pdf.getBrowser();

    try {
      return await this.renderPdfPage(browser, html);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Sale PDF render failed, retrying once with a fresh page: ${reason}`);
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
      await page.close().catch(() => undefined);
    }
  }

  /** Monto CLP sin decimales. */
  private clp(value: number | undefined): string {
    return `$${Math.round(value ?? 0).toLocaleString('es-CL')}`;
  }

  private esc(value: string | number | undefined): string {
    if (value === undefined || value === null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private buildTemplate(data: SalePdfDto): string {
    const logo = this.pdf.logo
      ? `<img src="${this.pdf.logo}" alt="Manage Repair Store">`
      : '<div style="font-size:22px;font-weight:700;color:#6D28D9;">MANAGE REPAIR STORE</div>';

    const rows = (data.products ?? []).map((p: SalePdfItem) => `
      <tr>
        <td class="p-name">${this.esc(p.name)}</td>
        <td class="p-num mono">${this.esc(p.quantity)}</td>
        <td class="p-num mono">${this.clp(p.sellingPrice)}</td>
        <td class="p-num mono">${(p.purchaseDiscount ?? 0) > 0 ? `-${this.clp(p.purchaseDiscount)}` : '—'}</td>
        <td class="p-num mono p-total">${this.clp(p.finalValue)}</td>
      </tr>`).join('\n');

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

  /* ---------- Sale code strip ---------- */
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
    font-size: 26px;
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

  /* ---------- Sections ---------- */
  .sec-head {
    display: flex;
    align-items: center;
    gap: 2.5mm;
    margin: 4.5mm 0 3.5mm;
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

  /* ---------- Items table ---------- */
  table.items {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
  }
  table.items th {
    text-align: left;
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--muted);
    padding: 2mm 2mm 2.5mm;
    border-bottom: 1.5px solid var(--accent);
  }
  table.items td {
    padding: 2.2mm 2mm;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }
  table.items tbody tr:last-child td { border-bottom: none; }
  .p-name { min-width: 60mm; }
  .p-num { text-align: right; white-space: nowrap; }
  .p-total { font-weight: 700; }

  /* ---------- Totals ---------- */
  .totals {
    margin-top: 3mm;
    margin-left: auto;
    width: 88mm;
    display: flex;
    flex-direction: column;
    gap: 1.8mm;
    font-size: 12.5px;
  }
  .totals .t-row {
    display: flex;
    justify-content: space-between;
    color: var(--soft-fg);
  }
  .totals .t-row.grand {
    border-top: 1.5px solid var(--accent);
    margin-top: 1.5mm;
    padding-top: 2.5mm;
    font-size: 16px;
    font-weight: 700;
    color: var(--fg);
  }
  .totals .t-row.grand span:last-child { color: var(--accent-dark); }

  /* ---------- Footer ---------- */
  .doc-footer {
    margin-top: auto;
    padding-top: 5mm;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: var(--muted);
  }
  .doc-footer .mono { font-family: var(--font-mono); }
  .thanks {
    text-align: center;
    font-size: 10.5px;
    color: var(--muted);
    margin-top: 6mm;
  }
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
        <div class="order-eyebrow">Comprobante de venta</div>
        <div class="order-code">${this.esc(data.code || 'VENTA')}</div>
        <div class="order-meta">
          ${data.date ? `Ingresada el ${this.esc(data.date)} <span class="sep">|</span>` : ''}
          ${data.seller ? `Atendido por ${this.esc(data.seller)}` : ''}
        </div>
      </div>
    </section>

    <div class="sec-head"><h2>Detalle de la venta</h2></div>
    <table class="items">
      <thead>
        <tr>
          <th>Producto</th>
          <th class="p-num">Cant.</th>
          <th class="p-num">Precio</th>
          <th class="p-num">Desc.</th>
          <th class="p-num">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="5">—</td></tr>'}
      </tbody>
    </table>

    <div class="totals">
      <div class="t-row"><span>Subtotal</span><span class="mono">${this.clp(data.subtotal)}</span></div>
      <div class="t-row"><span>Descuento</span><span class="mono">-${this.clp(data.discount)}</span></div>
      <div class="t-row grand"><span>Total</span><span class="mono">${this.clp(data.total)}</span></div>
    </div>

    <div class="thanks">Gracias por su compra · Manage Repair Store</div>

    <footer class="doc-footer">
      <span>Manage Repair Store · www.demo.example</span>
      <span class="mono">${this.esc(data.code || '')}</span>
    </footer>

  </div>
</body>
</html>`;
  }
}