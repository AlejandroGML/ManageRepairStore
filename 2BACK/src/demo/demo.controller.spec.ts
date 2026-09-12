import { ForbiddenException } from '@nestjs/common';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';

describe('DemoController', () => {
  const makeService = (enabled: boolean) =>
    ({
      enabled,
      reset: jest.fn().mockResolvedValue({ resetAt: '2026-01-01T00:00:00.000Z' }),
    }) as unknown as DemoService;

  it('returns the reset timestamp when demo mode is enabled', async () => {
    const service = makeService(true);
    const controller = new DemoController(service);

    const result = await controller.reset();

    expect(service.reset).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ resetAt: '2026-01-01T00:00:00.000Z' });
  });

  it('rejects with 403 when demo mode is disabled', async () => {
    const service = makeService(false);
    const controller = new DemoController(service);

    await expect(controller.reset()).rejects.toThrow(ForbiddenException);
    expect(service.reset).not.toHaveBeenCalled();
  });
});
