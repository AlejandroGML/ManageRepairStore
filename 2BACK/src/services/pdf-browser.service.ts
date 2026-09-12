import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

interface FontSpec {
  file: string;
  family: string;
  weight: number;
}

/**
 * Fuentes web empaquetadas (Fira Sans / Fira Code, subset latin) para que los
 * PDFs rendericen idénticos offline. Viven en 2BACK/assets/fonts — resueltas
 * desde cwd para que el build (dist/) no necesite copiar binarios.
 */
const PDF_FONTS: FontSpec[] = [
  { file: 'fira-sans-400.woff2', family: 'Fira Sans', weight: 400 },
  { file: 'fira-sans-500.woff2', family: 'Fira Sans', weight: 500 },
  { file: 'fira-sans-600.woff2', family: 'Fira Sans', weight: 600 },
  { file: 'fira-sans-700.woff2', family: 'Fira Sans', weight: 700 },
  { file: 'fira-code-500.woff2', family: 'Fira Code', weight: 500 },
  { file: 'fira-code-700.woff2', family: 'Fira Code', weight: 700 },
];

/**
 * Activos compartidos de PDF: browser singleton de Puppeteer (se lanza una
 * vez y se reutiliza entre requests), logo base64 y tipografías.
 * Proveído a nivel raíz (AppModule) para que orden y ventas compartan TODO.
 */
@Injectable()
export class PdfBrowserService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfBrowserService.name);
  private logoBase64 = '';
  private fontFaceCss = '';
  private browserPromise: Promise<puppeteer.Browser> | null = null;

  constructor() {
    this.loadLogo();
    this.loadFonts();
  }

  get logo(): string {
    return this.logoBase64;
  }

  get fontsCss(): string {
    return this.fontFaceCss;
  }

  getBrowser(): Promise<puppeteer.Browser> {
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

  /** Inlinea los woff2 como base64 @font-face (rendering offline idéntico). */
  private loadFonts(): void {
    try {
      const dir = path.resolve(process.cwd(), 'assets', 'fonts');
      this.fontFaceCss = PDF_FONTS
        .map((f) => {
          const b64 = fs.readFileSync(path.join(dir, f.file)).toString('base64');
          return (
            `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};` +
            `font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');}`
          );
        })
        .join('\n');
    } catch {
      this.logger.warn('PDF fonts not found, falling back to system fonts');
      this.fontFaceCss = '';
    }
  }
}