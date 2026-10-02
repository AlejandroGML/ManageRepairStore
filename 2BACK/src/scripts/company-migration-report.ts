/**
 * Dry-run del cambio `CompanyEntityFormalization` — SOLO LECTURA.
 *
 * Reporta qué haría la migración sobre la base apuntada por el env vigente:
 *  - Grupos con rut significativo → se mantienen como empresas
 *  - Grupos sin rut significativo (NULL / <7 / solo ceros) → sus clientes
 *    pasan a company_id NULL y el grupo se elimina
 *
 * Uso (desde 2BACK):
 *   pnpm exec ts-node src/scripts/company-migration-report.ts
 *   DB_DATABASE=manage_repair_store pnpm exec ts-node src/scripts/...
 */
import { AppDataSource } from '../datasource';

/** SQL: el rut extraído tiene contenido real (>=7 chars, no solo ceros). */
const MEANINGFUL = (col: string): string =>
  `length(regexp_replace(${col}, '[^0-9kK]', '', 'g')) >= 7 ` +
  `AND regexp_replace(${col}, '[^0-9kK]', '', 'g') !~ '^0+$'`;

async function main(): Promise<void> {
  const ds = AppDataSource;
  await ds.initialize();

  const [tableRow] = await ds.query(
    `SELECT CASE
        WHEN to_regclass('public.company_entity') IS NOT NULL THEN 'company_entity'
        WHEN to_regclass('public.client_group_entity') IS NOT NULL THEN 'client_group_entity'
        ELSE NULL END AS t`,
  );
  const table: string | null = tableRow?.t ?? null;
  const migrated = table === 'company_entity';

  console.log(`\n📋 Reporte de migración empresas — tabla detectada: ${table ?? '(ninguna)'}`);
  console.log(migrated ? '(la migración YA está aplicada — reporte post-estado)\n' : '(estado PRE-migración — simulación)\n');

  const [{ clients }] = await ds.query(`SELECT COUNT(*)::int AS clients FROM client_entity`);
  console.log(`👥 Clientes totales: ${clients}`);

  if (!migrated) {
    // Política B (ABAGAS 2026-10-01): sobrevive como empresa solo el grupo
    // con rut significativo Y 2+ clientes.
    const [keep] = await ds.query(`
      SELECT COUNT(*)::int AS groups,
             COALESCE(SUM(sub.n), 0)::int AS clients
      FROM ${table} g
      JOIN LATERAL (
        SELECT COUNT(*) AS n FROM client_entity c WHERE c.group_id = g.id
      ) sub ON true
      WHERE ${MEANINGFUL('g.rut_normalizado')} AND sub.n >= 2`);
    const [dissolve] = await ds.query(`
      SELECT COUNT(*)::int AS groups,
             COALESCE(SUM(sub.n), 0)::int AS clients
      FROM ${table} g
      JOIN LATERAL (
        SELECT COUNT(*) AS n FROM client_entity c WHERE c.group_id = g.id
      ) sub ON true
      WHERE g.rut_normalizado IS NULL OR NOT (${MEANINGFUL('g.rut_normalizado')}) OR sub.n < 2`);

    console.log(`🏢 → se mantienen como EMPRESA (rut real + 2+ sucursales): ${keep.groups} grupos (${keep.clients} clientes)`);
    console.log(`💥 → se disuelven (clientes a NULL + grupo eliminado): ${dissolve.groups} grupos (${dissolve.clients} clientes)`);

    const sample = await ds.query(`
      SELECT g.id, g.name, g.rut_normalizado, sub.n AS clientes
      FROM ${table} g
      JOIN LATERAL (SELECT COUNT(*) AS n FROM client_entity c WHERE c.group_id = g.id) sub ON true
      WHERE ${MEANINGFUL('g.rut_normalizado')}
      ORDER BY sub.n DESC, g.id ASC LIMIT 15`);
    console.log('\n🔝 Empresas resultantes (top 15 por sucursales — el renombre posterior se hace en el modal):');
    for (const r of sample) {
      console.log(`   #${r.id}  ${String(r.name).slice(0, 40).padEnd(40)}  rut=${r.rut_normalizado ?? '-'}  sucursales=${r.clientes}`);
    }
    const junk = await ds.query(`
      SELECT g.rut_normalizado, COUNT(*)::int AS grupos, SUM(sub.n)::int AS clientes
      FROM ${table} g
      JOIN LATERAL (SELECT COUNT(*) AS n FROM client_entity c WHERE c.group_id = g.id) sub ON true
      WHERE NOT (${MEANINGFUL('g.rut_normalizado')})
      GROUP BY g.rut_normalizado ORDER BY clientes DESC LIMIT 10`);
    if (junk.length) {
      console.log('\n🗑️  Grupos basura a eliminar (top 10 por clientes liberados):');
      for (const r of junk) {
        console.log(`   rut='${r.rut_normalizado ?? 'NULL'}'  grupos=${r.grupos}  clientes=${r.clientes}`);
      }
    }
  } else {
    const [state] = await ds.query(`
      SELECT
        (SELECT COUNT(*)::int FROM company_entity) AS companies,
        (SELECT COUNT(*)::int FROM client_entity WHERE company_id IS NULL) AS particulars,
        (SELECT COUNT(*)::int FROM client_entity WHERE company_id IS NOT NULL) AS grouped,
        (SELECT COUNT(*)::int FROM company_entity co
           WHERE NOT EXISTS (SELECT 1 FROM client_entity c WHERE c.company_id = co.id)) AS orphans`);
    console.log(`🏢 Empresas: ${state.companies}`);
    console.log(`👤 Particulares (company_id NULL): ${state.particulars}`);
    console.log(`🔗 Agrupados: ${state.grouped}`);
    console.log(`⚠️  Empresas huérfanas (deberían ser 0): ${state.orphans}`);
  }

  await ds.destroy();
}

main().catch((error) => {
  console.error('✗ Reporte falló:', error);
  process.exit(1);
});
