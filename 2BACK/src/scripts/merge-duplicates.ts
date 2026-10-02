import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
// Mirror the datasource's env selection (ABAGAS finding P3).
dotenv.config({
  path: path.resolve(
    __dirname,
    process.env.NODE_ENV === 'production' ? '../../.env.production' : '../../.env.development',
  ),
});

/**
 * Merge de clientes duplicados a partir del reporte de find-duplicate-groups.
 *
 * Flujo por grupo:
 *   1. Elige canónico = miembro con MÁS ÓRDENES (empate: id más bajo).
 *   2. Reasigna order_entity."clientId" al canónico.
 *   3. Desactiva los duplicados (active=false, nunca DELETE — filosofía
 *      de dos etapas del sistema).
 *
 * Seguridad:
 *   - DRY-RUN por defecto (escribe merge-plan-<tier>.json, no toca la BD).
 *   - --execute aplica; antes respalda clientes+órdenes afectados en
 *     merge-backup-<timestamp>.json.
 *   - Un transaction por grupo: todo o nada.
 *   - Excluye clusters tipo sucursal (≥3 miembros con empresa: estructura
 *     legítima, no duplicación) y grupos > --max-size (requieren ojo humano).
 *
 * Uso:
 *   ts-node src/scripts/merge-duplicates.ts --tier=1 [--execute] [--limit=N]
 *     [--max-size=N] [--aggressive] [--hard-delete]
 *   --aggressive: no excluye clusters tipo sucursal.
 *   --hard-delete: DELETE físico del duplicado tras reasignar sus órdenes.
 */
import { AppDataSource } from '../datasource';

interface ReportMember {
  id: number;
  name: string;
  company_name: string | null;
}
interface ReportGroup {
  strength: 'strong' | 'mixed' | 'fuzzy';
  members: ReportMember[];
  matchedFields: Record<string, number>;
  matchedPairs: number;
}

const STRENGTH_BY_TIER: Record<number, 'strong' | 'mixed' | 'fuzzy'> = {
  1: 'strong',
  2: 'mixed',
  3: 'fuzzy',
};

function argValue(flag: string): string | undefined {
  const a = argv.find((x) => x.startsWith(`--${flag}=`));
  return a?.split('=')[1];
}
const hasFlag = (flag: string): boolean => argv.includes(`--${flag}`);

const argv = process.argv.slice(2);
const tier = Number(argValue('tier') ?? 1);
const execute = hasFlag('execute');
/** --aggressive: sin exclusiones de sucursal (Xoko: "lo que no cuadra se borra"). */
const aggressive = hasFlag('aggressive');
/** --hard-delete: DELETE del duplicado tras reasignar órdenes (vs active=false). */
const hardDelete = hasFlag('hard-delete');
const limit = Number(argValue('limit') ?? 0);
const maxSize = Number(argValue('max-size') ?? 4);

const STRENGTH = STRENGTH_BY_TIER[tier];
if (!STRENGTH) {
  console.error('❌ --tier debe ser 1 (strong), 2 (mixed) o 3 (fuzzy)');
  process.exit(1);
}

/** Cluster tipo sucursal: estructura legítima del negocio, no duplicación.
 *  ≥2 miembros con empresa = requiere revisión humana (podrían ser
 *  sucursales del mismo retail compartiendo RUT). */
function looksLikeSucursal(g: ReportGroup): boolean {
  const conEmpresa = g.members.filter((m) => (m.company_name ?? '').trim() !== '');
  if (g.members.length >= 3 && conEmpresa.length >= 2) return true;
  return g.members.length === 2 && conEmpresa.length === 2;
}

async function main(): Promise<void> {
  const reportPath = path.resolve(process.cwd(), 'duplicates-report.json');
  const report: { groups: ReportGroup[] } = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  const candidates = report.groups.filter(
    (g) =>
      g.strength === STRENGTH &&
      g.members.length >= 2 &&
      g.members.length <= maxSize &&
      (aggressive || !looksLikeSucursal(g)),
  );
  const limited = limit > 0 ? candidates.slice(0, limit) : candidates;

  const ds = AppDataSource;
  await ds.initialize();

  // órdenes por cliente (para elegir canónico)
  const allIds = [...new Set(limited.flatMap((g) => g.members.map((m) => m.id)))];
  const orderCounts = new Map<number, number>();
  if (allIds.length) {
    const rows: Array<{ cid: number; n: string }> = await ds.query(
      `SELECT "clientId" AS cid, COUNT(*)::text AS n FROM order_entity
       WHERE "clientId" = ANY($1::int[]) GROUP BY 1`,
      [allIds],
    );
    for (const r of rows) orderCounts.set(Number(r.cid), Number(r.n));
  }

  interface PlanEntry {
    keep: number;
    keepName: string;
    merge: number[];
    ordersMoved: number;
    members: Array<{ id: number; name: string; orders: number }>;
  }

  const plan: PlanEntry[] = [];
  const skipped: string[] = [];
  for (const g of limited) {
    const ids = g.members.map((m) => m.id);
    const withCounts = g.members.map((m) => ({
      ...m,
      orders: orderCounts.get(m.id) ?? 0,
    }));
    // canónico: más órdenes; empate → id más bajo
    const sorted = [...withCounts].sort((a, b) => b.orders - a.orders || a.id - b.id);
    const keep = sorted[0];
    const dups = sorted.slice(1);
    const ordersMoved = dups.reduce((s, d) => s + d.orders, 0);
    plan.push({
      keep: keep.id,
      keepName: keep.name,
      merge: dups.map((d) => d.id),
      ordersMoved,
      members: withCounts.map(({ id, name, orders }) => ({ id, name, orders })),
    });
    void ids;
  }
  void skipped;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  if (!execute) {
    const planPath = path.resolve(process.cwd(), `merge-plan-tier${tier}.json`);
    fs.writeFileSync(planPath, JSON.stringify({ tier, generatedAt: new Date().toISOString(), plan }, null, 2));
    const totalOrders = plan.reduce((s, p) => s + p.ordersMoved, 0);
    console.log(`\n📋 TIER ${tier} (${STRENGTH}) — DRY RUN: ${plan.length} merges planificados (${totalOrders} órdenes a mover)`);
    console.log(`   Plan completo: ${planPath}`);
    for (const p of plan.slice(0, 15)) {
      const dups = p.merge.map((id) => `#${id}`).join(', ');
      console.log(`   mantener #${p.keep} ${p.keepName.slice(0, 28)}  ← fusionar ${dups}  (${p.ordersMoved} órdenes)`);
    }
    if (plan.length > 15) console.log(`   ... y ${plan.length - 15} más`);
    console.log('\n   Revisa el plan y ejecuta con: --execute');
    await ds.destroy();
    return;
  }

  // ---- EXECUTE ----
  const backups: unknown[] = [];
  let merged = 0;
  let ordersTotal = 0;

  for (const entry of plan) {
    try {
      await ds.transaction(async (em) => {
        // backup: clientes a desactivar + sus órdenes pre-merge
        const dupClients = await em.query(
          `SELECT * FROM client_entity WHERE id = ANY($1::int[])`,
          [entry.merge],
        );
        const dupOrders = await em.query(
          `SELECT * FROM order_entity WHERE "clientId" = ANY($1::int[])`,
          [entry.merge],
        );
        backups.push({ keep: entry.keep, clients: dupClients, orders: dupOrders });

        // reasignar órdenes al canónico
        await em.query(
          `UPDATE order_entity SET "clientId" = $1 WHERE "clientId" = ANY($2::int[])`,
          [entry.keep, entry.merge],
        );
        // desactivar duplicados; con --hard-delete, borrar (ya sin referencias)
        if (hardDelete) {
          await em.query(`DELETE FROM client_entity WHERE id = ANY($1::int[])`, [entry.merge]);
        } else {
          await em.query(
            `UPDATE client_entity SET active = false WHERE id = ANY($1::int[])`,
            [entry.merge],
          );
        }
        merged += 1;
        ordersTotal += entry.ordersMoved;
      });
      console.log(`✅ #${entry.keep} ${entry.keepName.slice(0, 30)} ← ${entry.merge.join(',')} (${entry.ordersMoved} órdenes)`);
    } catch (err) {
      console.error(`❌ grupo keep=#${entry.keep}:`, err instanceof Error ? err.message : err);
    }
  }

  const backupPath = path.resolve(process.cwd(), `merge-backup-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backups, null, 2), 'utf8');

  console.log(`\n🏁 ${merged}/${plan.length} merges aplicados · ${ordersTotal} órdenes reasignadas`);
  console.log(`   Backup: ${backupPath}`);
  await ds.destroy();
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
