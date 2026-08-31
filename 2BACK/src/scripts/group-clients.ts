import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

/**
 * Group clients by matching raw RUT digits.
 * Since rut_normalizado has a UNIQUE constraint, only the first record per
 * normalized RUT gets a value. This script groups ALL records that share
 * the same raw digits (from rut_raw) and sets parent_client_id to the oldest.
 *
 * Self-reference prevented. Only groups non-empty, valid-looking RUTs.
 * Idempotent: only sets parent_client_id WHERE currently NULL.
 */
import { AppDataSource } from '../datasource';

async function groupClientsScript(): Promise<void> {
  const ds = AppDataSource;
  await ds.initialize();

  console.log('📋 Grouping clients by matching raw RUT digits...');

  // The grouping is a two-step process:
  // 1. Extract digit groups from rut_raw using SQL
  // 2. UPDATE parent_client_id for children

  // Step 1: Find digit groups with multiple records
  const groups = await ds.query(`
    SELECT
      regexp_replace(TRIM(rut_raw), '[^0-9]', '', 'g') AS digits,
      MIN(id) AS oldest_id,
      COUNT(*) AS total,
      array_agg(id ORDER BY id) AS all_ids
    FROM client_entity
    WHERE rut_raw IS NOT NULL
      AND LENGTH(TRIM(rut_raw)) >= 7
      AND regexp_replace(TRIM(rut_raw), '[^0-9]', '', 'g') !~ '^0+$'
      AND regexp_replace(TRIM(rut_raw), '[^0-9]', '', 'g') != ''
    GROUP BY regexp_replace(TRIM(rut_raw), '[^0-9]', '', 'g')
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `);

  console.log(`  → ${groups.length} RUT digit groups with multiple records`);

  let updated = 0;

  for (const group of groups) {
    const childrenIds = group.all_ids.filter(
      (id: number) => id !== group.oldest_id,
    );

    console.log(
      `  ${group.digits} (${group.total} records): parent=#${group.oldest_id}, children=${childrenIds.join(', ')}`,
    );

    const result = await ds.query(
      `UPDATE client_entity
       SET parent_client_id = $1
       WHERE id = ANY($2::int[])
         AND parent_client_id IS NULL
         AND id != $1`,
      [group.oldest_id, childrenIds],
    );
    updated += result[1] || 0;
  }

  console.log(`\n✅ Grouping complete:`);
  console.log(`  ✓ ${groups.length} RUT groups with multiples`);
  console.log(`  ✓ ${updated} children assigned to parents`);

  // Show summary
  const summary = await ds.query(`
    SELECT COUNT(*) AS total_groups, SUM(cnt) AS total_children
    FROM (
      SELECT parent_client_id, COUNT(*) AS cnt
      FROM client_entity
      WHERE parent_client_id IS NOT NULL
      GROUP BY parent_client_id
    ) sub
  `);
  if (summary.length > 0) {
    console.log(`  📊 ${summary[0].total_groups} parent groups with ${summary[0].total_children} total children`);
  }

  await ds.destroy();
}

groupClientsScript().catch((error) => {
  console.error('✗ Grouping failed:', error);
  process.exit(1);
});
