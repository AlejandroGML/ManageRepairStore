/**
 * Migration: Add stock column to ProductEntity and compute initial values.
 *
 * Idempotent — safe to run multiple times. Computes initial product.stock
 * from the finalStock of the most recent non-deleted transaction per product.
 * Products without non-deleted transactions default to stock = 0.
 *
 * Usage: npx ts-node migration-add-product-stock.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env.development') });

import { AppDataSource } from './src/datasource';

async function migrate() {
  const dataSource = await AppDataSource.initialize();

  try {
    // Query: for each product, find the last non-deleted transaction's finalStock
    const result = await dataSource.query(`
      UPDATE product
      SET stock = COALESCE(
        (
          SELECT "finalStock"
          FROM transaction
          WHERE transaction."productId" = product.id
            AND transaction.deleted = false
          ORDER BY transaction."createdAt" DESC
          LIMIT 1
        ), 0
      )
    `);

    console.log(`Migration complete. Updated rows:`, result);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

migrate().catch(console.error);
