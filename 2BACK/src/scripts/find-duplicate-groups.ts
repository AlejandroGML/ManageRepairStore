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
 * Escaneo batch de grupos de clientes duplicados (solo lectura: NO muta nada).
 *
 * Reutiliza el motor del anti-duplicados de registro (duplicate-matcher.ts):
 *  - claves fuertes exactas: RUT real, teléfono (últimos 8 dígitos),
 *    email real (con @ — excluye basura tipo "sc")
 *  - campos difusos con los mismos umbrales: nombre >= 0.82,
 *    dirección >= 0.90. La empresa NO une grupos: compartir razón social
 *    es la estructura multi-sucursal legítima del negocio.
 *
 * Los pares que comparten alguna clave fuerte se agrupan vía mapas O(n);
 * los difusos se evalúan par a par (similarityAtLeast rechaza en O(1) los
 * pares imposibles por largo, ver commit perf(duplicates)).
 *
 * Salida: reporte JSON (default 2BACK/duplicates-report.json, gitignored)
 * + resumen por consola. El merge real queda para revisión humana: este
 * script NUNCA escribe en la base.
 */
import { AppDataSource } from '../datasource';
import { ClientEntity } from '../entities/client.entity';
import {
  normalize,
  phoneKey,
  similarityAtLeast,
  THRESHOLDS,
} from '../client/duplicate-matcher';

interface Prepped {
  id: number;
  name: string;
  rut_raw: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  // campos ya normalizados para el escaneo
  nRut: string;
  nPhone: string;
  nEmail: string;
  nName: string;
  nAddress: string;
}

interface GroupReport {
  strength: 'strong' | 'mixed' | 'fuzzy';
  members: Array<Pick<
    Prepped,
    'id' | 'name' | 'rut_raw' | 'phone' | 'email' | 'address' | 'city'
  >>;
  matchedFields: Record<string, number>;
  matchedPairs: number;
}

/** Union-Find con path compression + union by size. */
class DSU {
  private parent: Map<number, number> = new Map();
  private size: Map<number, number> = new Map();

  find(x: number): number {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.size.set(x, 1);
    }
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    while (this.parent.get(x) !== root) {
      const next = this.parent.get(x)!;
      this.parent.set(x, root);
      x = next;
    }
    return root;
  }

  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    if (this.size.get(ra)! < this.size.get(rb)!) {
      this.parent.set(ra, rb);
      this.size.set(rb, this.size.get(rb)! + this.size.get(ra)!);
    } else {
      this.parent.set(rb, ra);
      this.size.set(ra, this.size.get(ra)! + this.size.get(rb)!);
    }
  }

  groups(): Map<number, number[]> {
    const out = new Map<number, number[]>();
    for (const id of this.parent.keys()) {
      const root = this.find(id);
      if (!out.has(root)) out.set(root, []);
      out.get(root)!.push(id);
    }
    return out;
  }
}

function isMeaningfulRut(rut: string): boolean {
  return rut.length >= 7 && !/^0+$/.test(rut);
}

/** Email "real" (con @ y largo razonable): excluye basura tipo "sc"/"0"
 *  que en producción agrupaba 121 clientes en un solo mega-grupo falso. */
function isMeaningfulEmail(email: string): boolean {
  return email.includes('@') && email.length >= 6 && !/^\d+$/.test(email);
}

function prep(c: ClientEntity): Prepped {
  return {
    id: c.id,
    name: c.name,
    rut_raw: c.rut_raw,
    phone: c.phone,
    email: c.email,
    address: c.address,
    city: c.city,
    nRut: normalize(c.rut_normalizado || c.rut_raw),
    nPhone: phoneKey(c.phone ?? ''),
    nEmail: isMeaningfulEmail((c.email ?? '').toLowerCase().trim()) ? (c.email ?? '').toLowerCase().trim() : '',
    nName: normalize(c.name),
    nAddress: normalize(c.address),
  };
}

async function findDuplicateGroups(): Promise<void> {
  const outArgIdx = process.argv.indexOf('--out');
  const outPath = path.resolve(
    process.cwd(),
    outArgIdx > -1 ? process.argv[outArgIdx + 1] : 'duplicates-report.json',
  );

  const ds = AppDataSource;
  await ds.initialize();

  console.log('📋 Escaneando clientes duplicados (solo lectura)...');
  const clients = await ds
    .getRepository(ClientEntity)
    .createQueryBuilder('c')
    .select([
      'c.id', 'c.name', 'c.rut_raw', 'c.rut_normalizado', 'c.phone',
      'c.email', 'c.address', 'c.city',
    ])
    .where('c.active = :active', { active: true })
    .getMany();

  console.log(`   ${clients.length} clientes activos`);
  const rows = clients.map(prep);

  const dsu = new DSU();
  const edgeFields = new Map<string, Set<string>>(); // "a|b" -> campos que unieron

  const link = (a: number, b: number, field: string): void => {
    dsu.union(a, b);
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (!edgeFields.has(key)) edgeFields.set(key, new Set());
    edgeFields.get(key)!.add(field);
  };

  // 1) Claves fuertes vía mapas (O(n), sin pares)
  const byRut = new Map<string, number[]>();
  const byPhone = new Map<string, number[]>();
  const byEmail = new Map<string, number[]>();
  for (const r of rows) {
    if (isMeaningfulRut(r.nRut)) {
      const list = byRut.get(r.nRut) ?? [];
      list.push(r.id);
      byRut.set(r.nRut, list);
    }
    if (r.nPhone.length >= 6) {
      const list = byPhone.get(r.nPhone) ?? [];
      list.push(r.id);
      byPhone.set(r.nPhone, list);
    }
    if (r.nEmail) {
      const list = byEmail.get(r.nEmail) ?? [];
      list.push(r.id);
      byEmail.set(r.nEmail, list);
    }
  }
  for (const ids of byRut.values())
    for (let i = 1; i < ids.length; i++) link(ids[0], ids[i], 'rut');
  for (const ids of byPhone.values())
    for (let i = 1; i < ids.length; i++) link(ids[0], ids[i], 'phone');
  for (const ids of byEmail.values())
    for (let i = 1; i < ids.length; i++) link(ids[0], ids[i], 'email');

  // 2) Campos difusos par a par con rechazo barato por largo
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i];
    for (let j = i + 1; j < rows.length; j++) {
      const b = rows[j];
      if (a.nName.length >= 3 && b.nName.length >= 3) {
        const sim = similarityAtLeast(a.nName, b.nName, THRESHOLDS.name);
        if (sim >= THRESHOLDS.name) link(a.id, b.id, 'name');
      }
      if (a.nAddress.length >= 5 && b.nAddress.length >= 5) {
        const sim = similarityAtLeast(a.nAddress, b.nAddress, THRESHOLDS.address);
        if (sim >= THRESHOLDS.address) link(a.id, b.id, 'address');
      }
    }
  }

  // 3) Reporte
  const groups: GroupReport[] = [];
  for (const [, ids] of dsu.groups()) {
    if (ids.length < 2) continue;
    const members = ids
      .map((id) => byId.get(id)!)
      .sort((x, y) => x.id - y.id);
    const matchedFields: Record<string, number> = {};
    let strong = false;
    let fuzzy = false;
    for (const id of ids) {
      for (const other of ids) {
        if (other <= id) continue;
        const key = `${id}|${other}`;
        const fields = edgeFields.get(key);
        if (!fields) continue;
        for (const f of fields) {
          matchedFields[f] = (matchedFields[f] ?? 0) + 1;
          if (f === 'rut' || f === 'phone' || f === 'email') strong = true;
          else fuzzy = true;
        }
      }
    }
    groups.push({
      strength: strong && fuzzy ? 'mixed' : strong ? 'strong' : 'fuzzy',
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        rut_raw: m.rut_raw,
        phone: m.phone,
        email: m.email,
        address: m.address,
        city: m.city,
      })),
      matchedFields,
      matchedPairs: Object.values(matchedFields).reduce((s, n) => s + n, 0),
    });
  }

  const order = { strong: 0, mixed: 1, fuzzy: 2 } as const;
  groups.sort(
    (g, h) =>
      order[g.strength] - order[h.strength] ||
      h.members.length - g.members.length ||
      h.matchedPairs - g.matchedPairs,
  );

  const report = {
    generatedAt: new Date().toISOString(),
    totalClients: rows.length,
    totalGroups: groups.length,
    groups,
  };
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`\n✅ ${groups.length} grupos de duplicados (reporte: ${outPath})`);
  const byStrength = {
    strong: groups.filter((g) => g.strength === 'strong').length,
    mixed: groups.filter((g) => g.strength === 'mixed').length,
    fuzzy: groups.filter((g) => g.strength === 'fuzzy').length,
  };
  console.log(
    `   strong (RUT/teléfono/email exacto): ${byStrength.strong} · mixed: ${byStrength.mixed} · solo fuzzy: ${byStrength.fuzzy}`,
  );
  console.log('\n   Top 15 (más confianza primero):');
  for (const g of groups.slice(0, 15)) {
    const members = g.members
      .map((m) => `#${m.id} ${m.name}`)
      .join('  ↔  ');
    const fields = Object.entries(g.matchedFields)
      .map(([f, n]) => `${f}×${n}`)
      .join(', ');
    console.log(`   [${g.strength}] ${members}  {${fields}}`);
  }

  await ds.destroy();
}

findDuplicateGroups().catch((err) => {
  console.error('❌ Error en el escaneo:', err);
  process.exit(1);
});
