import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { runDemoSeed } from './demo-seed';

/**
 * Demo ephemerality: POST /demo/reset re-runs the synthetic seed so any
 * visitor's edits vanish on the next page load. Concurrent resets are
 * serialized — late callers await the in-flight run instead of racing it.
 */
@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);
  private running: Promise<void> | null = null;

  constructor(private readonly dataSource: DataSource) {}

  /** Demo endpoints are disabled with DEMO_MODE=false. */
  get enabled(): boolean {
    return process.env.DEMO_MODE !== 'false';
  }

  async reset(): Promise<{ resetAt: string }> {
    if (!this.running) {
      this.running = runDemoSeed(this.dataSource)
        .catch((err) => {
          this.logger.error(
            'Demo reset failed',
            err instanceof Error ? err.stack : String(err),
          );
          throw err;
        })
        .finally(() => {
          this.running = null;
        });
    }
    await this.running;
    return { resetAt: new Date().toISOString() };
  }
}
