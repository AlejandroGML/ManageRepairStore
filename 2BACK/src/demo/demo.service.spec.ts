import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { DemoService } from './demo.service';
import { runDemoSeed } from './demo-seed';

jest.mock('./demo-seed', () => ({ runDemoSeed: jest.fn() }));

const runDemoSeedMock = runDemoSeed as jest.MockedFunction<typeof runDemoSeed>;

describe('DemoService', () => {
  let service: DemoService;

  beforeEach(async () => {
    jest.clearAllMocks();
    runDemoSeedMock.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [DemoService, { provide: DataSource, useValue: {} }],
    }).compile();

    service = module.get<DemoService>(DemoService);
  });

  afterEach(() => {
    delete process.env.DEMO_MODE;
  });

  it('resets by running the seed and returns a timestamp', async () => {
    const result = await service.reset();

    expect(runDemoSeedMock).toHaveBeenCalledTimes(1);
    expect(typeof result.resetAt).toBe('string');
    expect(new Date(result.resetAt).getTime()).not.toBeNaN();
  });

  it('serializes concurrent resets into a single seed run', async () => {
    let resolveSeed!: () => void;
    runDemoSeedMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSeed = resolve;
      }),
    );

    const first = service.reset();
    const second = service.reset();
    resolveSeed();
    await Promise.all([first, second]);

    expect(runDemoSeedMock).toHaveBeenCalledTimes(1);
  });

  it('allows a fresh reset after the previous one finished', async () => {
    await service.reset();
    await service.reset();

    expect(runDemoSeedMock).toHaveBeenCalledTimes(2);
  });

  it('enabled defaults to true and honors DEMO_MODE=false', () => {
    delete process.env.DEMO_MODE;
    expect(service.enabled).toBe(true);

    process.env.DEMO_MODE = 'false';
    expect(service.enabled).toBe(false);
  });
});
