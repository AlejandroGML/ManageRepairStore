import { PdfBrowserService } from './pdf-browser.service';

jest.mock('puppeteer', () => ({ launch: jest.fn() }));

import * as puppeteer from 'puppeteer';

describe('PdfBrowserService', () => {
  let service: PdfBrowserService;
  let mockBrowser: { newPage: jest.Mock; close: jest.Mock };

  beforeEach(() => {
    mockBrowser = { newPage: jest.fn(), close: jest.fn().mockResolvedValue(undefined) };
    (puppeteer.launch as jest.Mock).mockReset().mockResolvedValue(mockBrowser);
    service = new PdfBrowserService();
  });

  it('should expose the logo and fonts css (may be empty when files are missing)', () => {
    expect(typeof service.logo).toBe('string');
    expect(typeof service.fontsCss).toBe('string');
  });

  it('should reuse a single browser instance across requests', async () => {
    await service.getBrowser();
    await service.getBrowser();

    expect(puppeteer.launch).toHaveBeenCalledTimes(1);
  });

  it('should reset the singleton when launch fails so the next call retries', async () => {
    (puppeteer.launch as jest.Mock).mockRejectedValueOnce(new Error('no chrome'));

    await expect(service.getBrowser()).rejects.toThrow('no chrome');
    await service.getBrowser();

    expect(puppeteer.launch).toHaveBeenCalledTimes(2);
  });

  it('should close the browser on module destroy', async () => {
    await service.getBrowser();
    await service.onModuleDestroy();

    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
  });
});