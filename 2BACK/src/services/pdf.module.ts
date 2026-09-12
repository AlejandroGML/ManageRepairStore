import { Global, Module } from '@nestjs/common';
import { PdfBrowserService } from './pdf-browser.service';

/**
 * @Global: el browser de Puppeteer (singleton), logo y tipografías quedan
 * disponibles para cualquier módulo (order, sales, futuros) con UNA sola
 * instancia compartida.
 */
@Global()
@Module({
  providers: [PdfBrowserService],
  exports: [PdfBrowserService],
})
export class PdfModule {}