import { AppDataSource } from '../datasource';

/**
 * Record every migration in src/migrations/ as already applied — WITHOUT
 * running any DDL. For databases that already exist and match the current
 * entity graph (e.g. built by synchronize before migrations landed).
 *
 * NEVER mark-baseline a schema you have not diffed first: this records
 * "applied" for DDL that will never run. If the target schema does not
 * match the entities, fix the schema first (adoption), then mark.
 *
 * Usage (from 2BACK): pnpm migration:mark-baseline
 * Override the target DB with DB_DATABASE / DB_HOST / ... env vars.
 */
async function markBaseline() {
  const dataSource = await AppDataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "migrations" (
        "id" SERIAL PRIMARY KEY,
        "timestamp" BIGINT NOT NULL,
        "name" VARCHAR(255) NOT NULL
      )
    `);

    const migrations = dataSource.migrations;
    let inserted = 0;
    let skipped = 0;

    for (const migration of migrations) {
      const existing = await queryRunner.query(
        `SELECT 1 FROM "migrations" WHERE "name" = $1`,
        [migration.name],
      );
      if (Array.isArray(existing) && existing.length > 0) {
        skipped++;
        continue;
      }
      await queryRunner.query(
        `INSERT INTO "migrations" ("timestamp", "name") VALUES ($1, $2)`,
        // TypeORM parses the timestamp from the class-name suffix
        // (last 13 digits), same as its MigrationExecutor does.
        [parseInt(migration.name.slice(-13), 10), migration.name],
      );
      inserted++;
    }

    await queryRunner.commitTransaction();
    console.log(
      `mark-baseline: ${inserted} recorded, ${skipped} already present (${migrations.length} total)`,
    );
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('mark-baseline failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

// No dotenv here: the runtime container prunes devDependencies, and the
// CLI migration:* scripts don't load env files either. Pass DB_* env vars
// explicitly (compose env_file does this) or rely on the dev defaults.
markBaseline().catch((err) => {
  console.error(err);
  process.exit(1);
});
