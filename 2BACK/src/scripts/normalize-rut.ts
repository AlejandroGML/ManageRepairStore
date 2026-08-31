import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

import { ClientEntity } from '../entities/client.entity';
import { normalizeRut } from '../services/rut.service';
import { AppDataSource } from '../datasource';

async function normalizeRutScript(): Promise<void> {
  const ds = AppDataSource;
  await ds.initialize();

  const clientRepository = ds.getRepository(ClientEntity);

  console.log('📋 Reading client_entity records...');
  const clients = await clientRepository.find();
  console.log(`  → ${clients.length} records found`);

  let normalized = 0;
  let skipped = 0;
  let errors = 0;

  for (const client of clients) {
    if (!client.rut_raw || client.rut_raw.trim() === '') {
      skipped++;
      continue;
    }

    const result = normalizeRut(client.rut_raw);

    if (result !== null) {
      client.rut_normalizado = result;
      try {
        await clientRepository.save(client);
        normalized++;
      } catch (saveError: any) {
        // Unique constraint violation → duplicate normalized RUT, leave as NULL
        if (saveError.code === '23505') {
          skipped++;
        } else {
          console.error(`  ✗ Error saving client #${client.id}: ${saveError.message}`);
          errors++;
        }
      }
    } else {
      skipped++;
    }
  }

  console.log('\n✅ Normalization complete:');
  console.log(`  ✓ ${normalized} records normalized`);
  console.log(`  − ${skipped} records skipped (no valid RUT or duplicate)`);
  if (errors > 0) {
    console.log(`  ✗ ${errors} errors`);
  }

  await ds.destroy();
}

normalizeRutScript().catch((error) => {
  console.error('✗ Normalization failed:', error);
  process.exit(1);
});
