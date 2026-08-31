import { TestBed } from '@angular/core/testing';
import { QrService } from './qr.service';

describe('QrService', () => {
  let service: QrService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QrService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('toDataURL should return a string', async () => {
    const result = await service.toDataURL('12345');
    expect(typeof result).toBe('string');
    expect(result).toContain('data:image/png');
  });

  it('toCanvas should return a canvas element', async () => {
    const canvas = await service.toCanvas('12345');
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
  });
});
