import { OrderPdfService } from './order-pdf.service';
import { OrderPdfDto } from '../dto/order-pdf.dto';
import { PdfBrowserService } from '../services/pdf-browser.service';

jest.mock('puppeteer', () => ({ launch: jest.fn() }));
jest.mock('qrcode', () => ({ toDataURL: jest.fn() }));

import * as QRCode from 'qrcode';

describe('OrderPdfService', () => {
  let service: OrderPdfService;
  let mockPage: { setContent: jest.Mock; emulateMediaType: jest.Mock; pdf: jest.Mock; close: jest.Mock };
  let mockBrowser: { newPage: jest.Mock; close: jest.Mock };
  let pdfBrowser: { getBrowser: jest.Mock; logo: string; fontsCss: string };

  const mockOrder = (overrides: Partial<OrderPdfDto> = {}): OrderPdfDto => ({
    clientId: 1,
    code: 123,
    name: 'Test Client',
    rut: '12.345.678-5',
    address: 'Test Address',
    city: 'Viña del Mar',
    phone: '999888777',
    date: '01-02-2026 10:30',
    description: 'Fuga de gas',
    observation: 'Sin observaciones',
    ...overrides,
  });

  beforeEach(async () => {
    mockPage = {
      setContent: jest.fn().mockResolvedValue(undefined),
      emulateMediaType: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('fake-pdf')),
      close: jest.fn().mockResolvedValue(undefined),
    };
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };
    pdfBrowser = {
      getBrowser: jest.fn().mockResolvedValue(mockBrowser),
      logo: '',
      fontsCss: '',
    };
    (QRCode.toDataURL as jest.Mock).mockReset().mockResolvedValue('data:image/png;base64,GENERATED_QR');

    service = new OrderPdfService(pdfBrowser as unknown as PdfBrowserService);
  });

  describe('QR resolution', () => {
    it('should generate the QR server-side from the order code when data.qr is not provided', async () => {
      await service.generateOrderPdf(mockOrder());

      expect(QRCode.toDataURL).toHaveBeenCalledWith('123', { width: 144, margin: 1 });
      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('data:image/png;base64,GENERATED_QR'),
        expect.anything(),
      );
    });

    it('should generate the QR from an ORD-xxxx string code unchanged', async () => {
      await service.generateOrderPdf(mockOrder({ code: 'ORD-1234' }));

      expect(QRCode.toDataURL).toHaveBeenCalledWith('ORD-1234', { width: 144, margin: 1 });
      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('data:image/png;base64,GENERATED_QR'),
        expect.anything(),
      );
    });

    it('should use the client-provided QR data URL and skip generation (backward compat)', async () => {
      await service.generateOrderPdf(mockOrder({ qr: 'data:image/png;base64,CLIENT_QR' }));

      expect(QRCode.toDataURL).not.toHaveBeenCalled();
      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('data:image/png;base64,CLIENT_QR'),
        expect.anything(),
      );
    });

    it('should render the order code and client name in the template', async () => {
      await service.generateOrderPdf(mockOrder());

      const html = mockPage.setContent.mock.calls[0][0] as string;
      expect(html).toContain('>123<');
      expect(html).toContain('Test Client');
    });

    it('should tolerate a missing code without throwing (legacy rows)', async () => {
      // Legacy rows predate the code field; generation must not crash.
      const legacy = mockOrder({ code: undefined as unknown as number });
      await expect(service.generateOrderPdf(legacy)).resolves.toBeInstanceOf(Buffer);
    });
  });

  describe('render', () => {
    it('should close the page after each render (browser stays alive)', async () => {
      await service.generateOrderPdf(mockOrder());

      expect(mockPage.close).toHaveBeenCalledTimes(1);
      expect(mockBrowser.close).not.toHaveBeenCalled();
    });

    it('should retry once with a fresh page when the render fails', async () => {
      mockPage.pdf.mockRejectedValueOnce(new Error('renderer crashed'));

      const result = await service.generateOrderPdf(mockOrder());

      expect(result).toEqual(Buffer.from('fake-pdf'));
      expect(mockBrowser.newPage).toHaveBeenCalledTimes(2);
      expect(mockPage.pdf).toHaveBeenCalledTimes(2);
    });

    it('should propagate the error when the retry also fails, closing failed pages', async () => {
      mockPage.pdf.mockRejectedValue(new Error('renderer crashed'));

      await expect(service.generateOrderPdf(mockOrder())).rejects.toThrow('renderer crashed');

      expect(mockBrowser.newPage).toHaveBeenCalledTimes(2);
      expect(mockPage.close).toHaveBeenCalledTimes(2);
    });
  });
});