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
 * Detección de productos "duplicados por nombre": normaliza (minúsculas,
 * sin acentos, sin puntuación, espacios colapsados) y agrupa por nombre
 * normalizado exacto + similitud difusa (>= 0.85) para los casos con
 * palabras/sufijos extra (codigo, factura). Solo lectura.
 */
import { AppDataSource } from '../datasource';
import { ProductEntity } from '../entities/product.entity';
import { normalize, similarityAtLeast } from '../client/duplicate-matcher';

async function main(): Promise<void> {
  const ds = AppDataSource;
  await ds.initialize();
  const products = await ds.getRepository(ProductEntity)
    .createQueryBuilder('p')
    .select(['p.id', 'p.name', 'p.stock', 'p.minimum'])
    .where('p.active = :active', { active: true })
    .getMany();

  interface Prepped { id: number; name: string; stock: number; nName: string }
  const exact = new Map<string, Prepped[]>();
  const prepped: Prepped[] = products.map((p) => ({ id: p.id, name: p.name, stock: p.stock, nName: normalize(p.name) }));
  for (const p of prepped) {
    const list = exact.get(p.nName) ?? [];
    list.push(p);
    exact.set(p.nName, list);
  }
  const exactGroups = [...exact.values()].filter((g) => g.length > 1);

  // difuso entre nombres cuyo normalizado NO es igual (pares con >= 0.85)
  const rest = prepped.filter((p) => (exact.get(p.nName)?.length ?? 0) === 1);
  const fuzzyPairs: Array<{ a: Prepped; b: Prepped; sim: number }> = [];
  for (let i = 0; i < rest.length; i++) {
    for (let j = i + 1; j < rest.length; j++) {
      const sim = similarityAtLeast(rest[i].nName, rest[j].nName, 0.85);
      if (sim >= 0.85) fuzzyPairs.push({ a: rest[i], b: rest[j], sim });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totalProducts: products.length,
    exactGroups: exactGroups.map((g) => g.map((p) => ({ id: p.id, name: p.name, stock: p.stock }))),
    fuzzyPairs: fuzzyPairs.map((x) => ({
      a: { id: x.a.id, name: x.a.name, stock: x.a.stock },
      b: { id: x.b.id, name: x.b.name, stock: x.b.stock },
      sim: Number(x.sim.toFixed(3)),
    })),
  };
  fs.writeFileSync(path.resolve(process.cwd(), 'product-names-report.json'), JSON.stringify(report, null, 2));
  console.log(`✅ ${exactGroups.length} grupos exactos · ${fuzzyPairs.length} pares difusos (>= 0.85)`);
  console.log('   Reporte: product-names-report.json');
  for (const g of exactGroups.slice(0, 10)) {
    console.log('   [exacto]', g.map((p) => `#${p.id} ${p.name.slice(0, 30)}`).join('  <->  '));
  }
  for (const x of fuzzyPairs.slice(0, 10)) {
    console.log(`   [${x.sim.toFixed(2)}] #${x.a.id} ${x.a.name.slice(0, 30)}  <->  #${x.b.id} ${x.b.name.slice(0, 30)}`);
  }
  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
