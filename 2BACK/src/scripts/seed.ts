import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

import { AppDataSource } from '../datasource';
import { runDemoSeed } from '../demo/demo-seed';

/**
 * CLI entry point: resets the demo database to the synthetic seed.
 * Run from 2BACK: pnpm run seed
 */
async function seed() {
  await AppDataSource.initialize();
  try {
    await runDemoSeed(AppDataSource);
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
