import { OrderPdfService } from './order-pdf.service';
import { OrderPdfDto } from '../dto/order-pdf.dto';

jest.mock('puppeteer', () => ({ launch: jest.fn() }));
jest.mock('qrcode', () => ({ toDataURL: jest.fn() }));

import * as puppeteer from 'puppeteer';
import * as QRCode from 'qrcode';

describe('OrderPdfService', () => {
  let service: OrderPdfService;
  let mockPage: { setContent: jest.Mock; emulateMediaType: jest.Mock; pdf: jest.Mock; close: jest.Mock };
  let mockBrowser: { newPage: jest.Mock; close: jest.Mock };

  const mockOrder = (overrides: Partial<OrderPdfDto> = {}): OrderPdfDto => ({
    clientId: 1,
    code: 123,
    name: 'Test Client',
    rut: '12.345.678-5',
    address: 'Test Address',
    city: 'Santiago',
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
    (puppeteer.launch as jest.Mock).mockReset().mockResolvedValue(mockBrowser);
    (QRCode.toDataURL as jest.Mock).mockReset().mockResolvedValue('data:image/png;base64,GENERATED_QR');

    service = new OrderPdfService();
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
  });

  describe('browser lifecycle', () => {
    it('should reuse a single browser instance across requests', async () => {
      await service.generateOrderPdf(mockOrder());
      await service.generateOrderPdf(mockOrder({ code: 456 }));

      expect(puppeteer.launch).toHaveBeenCalledTimes(1);
      expect(mockBrowser.newPage).toHaveBeenCalledTimes(2);
      expect(mockBrowser.close).not.toHaveBeenCalled();
    });

    it('should close the page but keep the shared browser alive after each render', async () => {
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

    it('should reset the singleton when launch fails so the next call retries', async () => {
      (puppeteer.launch as jest.Mock).mockRejectedValueOnce(new Error('no chrome'));

      await expect(service.generateOrderPdf(mockOrder())).rejects.toThrow('no chrome');

      await service.generateOrderPdf(mockOrder());

      expect(puppeteer.launch).toHaveBeenCalledTimes(2);
    });

    it('should close the browser on module destroy', async () => {
      await service.generateOrderPdf(mockOrder());
      await service.onModuleDestroy();

      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });
  });
});
