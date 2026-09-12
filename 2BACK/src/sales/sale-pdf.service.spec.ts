import { SalePdfService } from './sale-pdf.service';
import { PdfBrowserService } from '../services/pdf-browser.service';

jest.mock('puppeteer', () => ({ launch: jest.fn() }));

describe('SalePdfService', () => {
  let service: SalePdfService;
  let mockPage: { setContent: jest.Mock; emulateMediaType: jest.Mock; pdf: jest.Mock; close: jest.Mock };
  let mockBrowser: { newPage: jest.Mock; close: jest.Mock };

  const saleData = {
    code: 'VENTA-20260907-1530',
    seller: 'Alejandro M.',
    date: '07-09-2026 15:30',
    products: [
      { name: 'Termostato 3/4', quantity: 2, sellingPrice: 15000, purchaseDiscount: 0, finalValue: 30000 },
      { name: 'Válvula de seguridad', quantity: 1, sellingPrice: 8000, purchaseDiscount: 1000, finalValue: 7000 },
    ],
    subtotal: 38000,
    discount: 1000,
    total: 37000,
  };

  beforeEach(() => {
    mockPage = {
      setContent: jest.fn().mockResolvedValue(undefined),
      emulateMediaType: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('fake-sale-pdf')),
      close: jest.fn().mockResolvedValue(undefined),
    };
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const pdfBrowser = {
      getBrowser: jest.fn().mockResolvedValue(mockBrowser),
      logo: '',
      fontsCss: '',
    };
    service = new SalePdfService(pdfBrowser as unknown as PdfBrowserService);
  });

  it('should render the sale receipt and return a PDF buffer', async () => {
    const result = await service.generateSalePdf(saleData as any);

    expect(result).toEqual(Buffer.from('fake-sale-pdf'));
    expect(mockPage.pdf).toHaveBeenCalledTimes(1);
  });

  it('should include code, seller and every product row in the template', async () => {
    await service.generateSalePdf(saleData as any);

    const html = mockPage.setContent.mock.calls[0][0] as string;
    expect(html).toContain('VENTA-20260907-1530');
    expect(html).toContain('Alejandro M.');
    expect(html).toContain('Termostato 3/4');
    expect(html).toContain('Válvula de seguridad');
    expect(html).toContain('$37.000');
  });

  it('should escape HTML in product names', async () => {
    await service.generateSalePdf({
      ...saleData,
      products: [{ name: '<b>&test</b>', quantity: 1, sellingPrice: 100, finalValue: 100 }],
    } as any);

    const html = mockPage.setContent.mock.calls[0][0] as string;
    expect(html).toContain('&lt;b&gt;&amp;test&lt;/b&gt;');
    expect(html).not.toContain('<b>&test</b>');
  });
});