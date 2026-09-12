import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../datasource';
import { UserEntity } from '../entities/user.entity';
import { CategoryEntity } from '../entities/category.entity';
import { ProductEntity } from '../entities/product.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { ClientGroupEntity } from '../entities/client-group.entity';
import { ClientEntity } from '../entities/client.entity';
import { LogEntity } from '../entities/log.entity';
import { RefillGroupEntity } from '../entities/refill-group.entity';
import { OrderEntity } from '../entities/order.entity';
import { SaleEntity } from '../entities/sale.entity';
import { WorkerEntity } from '../entities/worker.entity';
import { calcularDV } from '../services/rut.service';

/**
 * Demo seed — 100% synthetic data for the Manage Repair Store portfolio demo.
 * Aligned with docs/manage-repair-store.html (prototype): same users, products,
 * locations, orders and activity feed.
 * Idempotent: truncates all demo tables and re-inserts from scratch.
 *
 * Run from 2BACK: pnpm run seed
 */

interface SyntheticRut {
  raw: string;
  normalized: string;
}

/** Build a valid Chilean RUT (módulo 11) from a base of digits */
function makeRut(base: string): SyntheticRut {
  const dv = calcularDV(base);
  const withDots = base.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return { raw: `${withDots}-${dv}`, normalized: `${base}-${dv}` };
}

const CATEGORIES = [
  'Pantallas',
  'Baterías',
  'Conectores',
  'Accesorios',
  'Herramientas',
  'Repuestos',
];

interface DemoProduct {
  name: string;
  category: string;
  stock: number;
  minimum: number;
  costPrice: number;
  sellingPrice: number;
  location: string;
  icon: string;
}

/** First 8 = prototype page 1 (P-001..P-008), 16 extra to reach 24 products. */
const PRODUCTS: DemoProduct[] = [
  { name: 'Pantalla OLED iPhone 11', category: 'Pantallas', stock: 2, minimum: 5, costPrice: 52000, sellingPrice: 89990, location: 'A1-01', icon: 'smartphone' },
  { name: 'Batería Samsung A54', category: 'Baterías', stock: 1, minimum: 5, costPrice: 14000, sellingPrice: 24990, location: 'A1-02', icon: 'battery_full' },
  { name: 'Módulo de carga USB-C', category: 'Conectores', stock: 14, minimum: 8, costPrice: 3200, sellingPrice: 7990, location: 'A2-01', icon: 'usb' },
  { name: 'Placa madre Xiaomi', category: 'Repuestos', stock: 7, minimum: 4, costPrice: 31000, sellingPrice: 49990, location: 'B1-03', icon: 'memory' },
  { name: 'Fuente de poder ATX', category: 'Repuestos', stock: 9, minimum: 4, costPrice: 21000, sellingPrice: 34990, location: 'B1-01', icon: 'bolt' },
  { name: 'Conector Lightning', category: 'Conectores', stock: 3, minimum: 10, costPrice: 2000, sellingPrice: 5990, location: 'A2-02', icon: 'cable' },
  { name: 'Vidrio templado', category: 'Accesorios', stock: 6, minimum: 12, costPrice: 1500, sellingPrice: 4990, location: 'A3-01', icon: 'screensaver' },
  { name: 'Cámara trasera Huawei', category: 'Repuestos', stock: 11, minimum: 4, costPrice: 17000, sellingPrice: 29990, location: 'A2-03', icon: 'photo_camera' },
  { name: 'Pantalla iPhone 11', category: 'Pantallas', stock: 12, minimum: 5, costPrice: 18000, sellingPrice: 28000, location: 'B2-01', icon: 'smartphone' },
  { name: 'Pantalla Samsung A54', category: 'Pantallas', stock: 8, minimum: 5, costPrice: 22000, sellingPrice: 32000, location: 'B2-02', icon: 'smartphone' },
  { name: 'Pantalla Motorola G54', category: 'Pantallas', stock: 10, minimum: 5, costPrice: 15000, sellingPrice: 24000, location: 'B2-03', icon: 'smartphone' },
  { name: 'Batería iPhone 12', category: 'Baterías', stock: 15, minimum: 4, costPrice: 9000, sellingPrice: 15000, location: 'C1-01', icon: 'battery_full' },
  { name: 'Batería Samsung S22', category: 'Baterías', stock: 9, minimum: 4, costPrice: 11000, sellingPrice: 18000, location: 'C1-02', icon: 'battery_full' },
  { name: 'Batería Xiaomi Redmi 10', category: 'Baterías', stock: 14, minimum: 4, costPrice: 7000, sellingPrice: 12000, location: 'C1-03', icon: 'battery_full' },
  { name: 'Conector de carga USB-C mini', category: 'Conectores', stock: 20, minimum: 8, costPrice: 2500, sellingPrice: 5000, location: 'A3-02', icon: 'usb' },
  { name: 'Cable USB-C trenzado 1m', category: 'Accesorios', stock: 40, minimum: 10, costPrice: 1200, sellingPrice: 3500, location: 'A3-03', icon: 'cable' },
  { name: 'Cargador 20W USB-C', category: 'Accesorios', stock: 30, minimum: 8, costPrice: 5000, sellingPrice: 9000, location: 'B3-01', icon: 'bolt' },
  { name: 'Funda silicona universal', category: 'Accesorios', stock: 35, minimum: 8, costPrice: 800, sellingPrice: 2500, location: 'B3-02', icon: 'screensaver' },
  { name: 'Kit destornilladores precisión', category: 'Herramientas', stock: 9, minimum: 3, costPrice: 9500, sellingPrice: 16000, location: 'C2-01', icon: 'construction' },
  { name: 'Estación de calor', category: 'Herramientas', stock: 7, minimum: 3, costPrice: 35000, sellingPrice: 55000, location: 'C2-02', icon: 'local_fire_department' },
  { name: 'Ventosa de succión', category: 'Herramientas', stock: 16, minimum: 4, costPrice: 1800, sellingPrice: 4000, location: 'C2-03', icon: 'compress' },
  { name: 'Cinta adhesiva B7000', category: 'Herramientas', stock: 28, minimum: 6, costPrice: 900, sellingPrice: 2200, location: 'A1-03', icon: 'sticky_note_2' },
  { name: 'Tapa trasera iPhone 11', category: 'Repuestos', stock: 9, minimum: 4, costPrice: 6000, sellingPrice: 11000, location: 'B1-02', icon: 'smartphone' },
  { name: 'Vidrio cámara iPhone 12', category: 'Repuestos', stock: 13, minimum: 4, costPrice: 2500, sellingPrice: 6000, location: 'A2-04', icon: 'photo_camera' },
];

interface DemoClient {
  name: string;
  companyName?: string;
  rut: SyntheticRut;
  address: string;
  city: string;
  phone: string;
  email: string;
  group: string;
}

const CLIENTS: DemoClient[] = [
  { name: 'María González', rut: makeRut('15234567'), address: 'Calle Los Cerezos 45', city: 'Las Condes', phone: '+56 9 8234 1102', email: 'maria.gonzalez@demo.example', group: 'Clientes Minoristas' },
  { name: 'Pedro Rojas', rut: makeRut('18765432'), address: 'Pasaje Los Aromos 8', city: 'La Florida', phone: '+56 9 6733 4487', email: 'pedro.rojas@demo.example', group: 'Clientes Minoristas' },
  { name: 'Juan Pérez', rut: makeRut('12345678'), address: 'Av. Irarrázaval 2890', city: 'Ñuñoa', phone: '+56 9 5210 9981', email: 'juan.perez@demo.example', group: 'Clientes Minoristas' },
  { name: 'Ana Torres', rut: makeRut('16987654'), address: 'Av. Providencia 987', city: 'Providencia', phone: '+56 9 7412 3321', email: 'ana.torres@demo.example', group: 'Clientes Minoristas' },
  { name: 'Luis Soto', rut: makeRut('19111222'), address: 'Calle Los Plátanos 120', city: 'Santiago', phone: '+56 9 8820 1456', email: 'luis.soto@demo.example', group: 'Clientes Minoristas' },
  { name: 'Comercial Demo SpA', companyName: 'Comercial Demo SpA', rut: makeRut('76034512'), address: 'Av. Providencia 1234', city: 'Providencia', phone: '+56 9 5555 1001', email: 'contacto@comercialdemo.example', group: 'Empresas' },
  { name: 'Taller Express Ltda', companyName: 'Taller Express Ltda', rut: makeRut('77123456'), address: 'Av. Matta 350', city: 'Santiago', phone: '+56 9 5555 1003', email: 'ventas@tallerexpress.example', group: 'Empresas' },
  { name: 'Electro Sur SpA', companyName: 'Electro Sur SpA', rut: makeRut('76987654'), address: 'Av. Vicuña Mackenna 6100', city: 'La Florida', phone: '+56 9 5555 1005', email: 'compras@electrosur.example', group: 'Empresas' },
];

/** Prototype: ORD-1039..ORD-1042 (las 4 más recientes, con código explícito). */
const ORDERS = [
  { clientName: 'Pedro Rojas', description: 'Reemplazo de batería iPhone', status: 'Entregado', total: 7990, agoMs: 2 * 86400 * 1000, code: 'ORD-1039' },
  { clientName: 'Ana Torres', description: 'Cambio de conector de carga', status: 'Pendiente', total: 24990, agoMs: 6 * 3600 * 1000, code: 'ORD-1040' },
  { clientName: 'Juan Pérez', description: 'Reparación fuente de poder', status: 'En reparacion', total: 34990, agoMs: 1 * 86400 * 1000, code: 'ORD-1041' },
  { clientName: 'María González', description: 'Cambio de pantalla iPhone 11', status: 'Entregado', total: 89990, agoMs: 3 * 3600 * 1000, code: 'ORD-1042' },
];

/** 32 órdenes históricas para llegar a las 36 del prototipo (códigos ORD-1007..1038). */
const HISTORIC_ORDERS = (() => {
  const clients = ['María González', 'Pedro Rojas', 'Juan Pérez', 'Ana Torres', 'Luis Soto', 'Comercial Demo SpA', 'Taller Express Ltda', 'Electro Sur SpA'];
  const statuses = ['Entregado', 'Entregado', 'Entregado', 'En reparacion', 'Pendiente'];
  const descriptions = [
    'Cambio de pantalla iPhone 11', 'Reemplazo de batería Samsung', 'Reparación de conector de carga',
    'Cambio de vidrio templado', 'Diagnóstico de equipo', 'Reparación de placa madre',
    'Cambio de cámara trasera', 'Limpieza y mantención', 'Actualización de software',
    'Cambio de módulo de carga', 'Reparación de audio', 'Cambio de flex de carga',
  ];
  const totals = [7990, 14990, 24990, 34990, 44990, 54990, 69990, 89990];
  const list: { clientName: string; description: string; status: string; total: number; agoMs: number; code: string }[] = [];
  for (let i = 0; i < 32; i++) {
    const codeNum = 1007 + i; // ORD-1007..ORD-1038
    list.push({
      clientName: clients[i % clients.length],
      description: descriptions[i % descriptions.length],
      status: statuses[i % statuses.length],
      total: totals[(i * 3) % totals.length],
      agoMs: (5 + i * 2) * 86400 * 1000, // de 5 a ~67 días atrás
      code: `ORD-${codeNum}`,
    });
  }
  return list;
})();

/** Prototype refill history: product, qty, provider, days ago. */
const REFILLS = [
  { productName: 'Batería Samsung A54', qty: 12, cost: 14000, provider: 'TecnoParts Ltda.', daysAgo: 2 },
  { productName: 'Módulo de carga USB-C', qty: 20, cost: 3200, provider: 'Electro Sur', daysAgo: 4 },
  { productName: 'Vidrio templado', qty: 30, cost: 1500, provider: 'TecnoParts Ltda.', daysAgo: 7 },
  { productName: 'Pantalla OLED iPhone 11', qty: 8, cost: 52000, provider: 'Pantallas CL', daysAgo: 11 },
];

/** Prototype activity feed: title, desc, time. */
const FEED = [
  { action: 'Venta ORD-1042 · $89.990', clientName: 'Pantalla iPhone 11 — María González', minutesAgo: 45 },
  { action: 'Nueva orden de servicio', clientName: 'Cambio de batería — Pedro Rojas', minutesAgo: 130 },
  { action: 'Reposición registrada', clientName: '+12 Batería Samsung A54', minutesAgo: 24 * 60 },
  { action: 'Venta ORD-1041 · $34.990', clientName: 'Fuente de poder ATX — Juan Pérez', minutesAgo: 27 * 60 },
];

/** Sales today = $412.900 and yesterday = $367.350 → delta +12,4%. */
const SALES_TODAY = [
  { total: 89990, minutesAgo: 60, productName: 'Pantalla OLED iPhone 11' },
  { total: 249900, minutesAgo: 180, productName: 'Estación de calor' },
  { total: 73010, minutesAgo: 300, productName: 'Placa madre Xiaomi' },
];
const SALES_YESTERDAY = [
  { total: 200000, daysAgo: 1, productName: 'Pantalla iPhone 11' },
  { total: 167350, daysAgo: 1, productName: 'Cargador 20W USB-C' },
];

async function seed() {
  const ds = AppDataSource;
  await ds.initialize();
  const qr = ds.createQueryRunner();
  await qr.connect();

  try {
    console.log('🌱 Seeding Manage Repair Store demo data (prototype-aligned, synthetic only)...');

    await qr.query(
      `TRUNCATE TABLE refill_groups, transaction_entity, order_entity, sales,
       client_entity, product_entity, category_entity, client_group_entity,
       user_entity, log_entity RESTART IDENTITY CASCADE`,
    );

    const now = new Date();
    const minutesAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000);
    const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000);
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400 * 1000);

    // 1) Users (prototype admin table: Alejandro / Natalia / Carlos Suspendido + bodega demo login)
    const userRepo = qr.manager.getRepository(UserEntity);
    const passwordHash = await bcrypt.hash('Demo1234!', 12);
    const admin = await userRepo.save(
      userRepo.create({ name: 'Alejandro Martínez', email: 'admin@demo.example', passwordHash, role: 'admin', active: true, updatedAt: minutesAgo(2) }),
    );
    const clerk = await userRepo.save(
      userRepo.create({ name: 'Natalia Ordenes', email: 'clerk@demo.example', passwordHash, role: 'seller', active: true, updatedAt: hoursAgo(1) }),
    );
    const suspended = await userRepo.save(
      userRepo.create({ name: 'Carlos Fuentes', email: 'carlos@demo.example', passwordHash, role: 'seller', active: false, updatedAt: daysAgo(12) }),
    );
    const bodega = await userRepo.save(
      userRepo.create({ name: 'Bodega Demo', email: 'bodega@demo.example', passwordHash, role: 'warehouse', active: true, updatedAt: hoursAgo(5) }),
    );
    console.log(`  ✓ Users: admin, clerk (Natalia Ordenes), carlos (Suspendido), bodega`);

    // 2) Categories
    const categoryRepo = qr.manager.getRepository(CategoryEntity);
    const categories = new Map<string, CategoryEntity>();
    for (const name of CATEGORIES) {
      categories.set(name, await categoryRepo.save(categoryRepo.create({ name })));
    }
    console.log(`  ✓ Categories: ${CATEGORIES.length}`);

    // 3) Products + initial transactions with real locations (prototype bodega)
    const productRepo = qr.manager.getRepository(ProductEntity);
    const txRepo = qr.manager.getRepository(TransactionEntity);
    for (const p of PRODUCTS) {
      const product = await productRepo.save(
        productRepo.create({
          name: p.name,
          stock: p.stock,
          minimum: p.minimum,
          active: true,
          image: p.icon,
          category: categories.get(p.category),
        }),
      );
      const snapshotData = {
        name: p.name,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        location: p.location,
        payMethod: 'Efectivo',
        finalStock: p.stock,
        description: 'Stock inicial demo',
        assignedWorker: 'Sin Datos',
      };
      await txRepo.save(
        txRepo.create({
          operation: 'Nuevo Producto',
          quantity: p.stock,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          location: p.location,
          payMethod: 'Efectivo',
          finalStock: p.stock,
          maxDiscount: 0,
          purchaseDiscount: 0,
          description: 'Stock inicial demo',
          assignedWorker: 'Sin Datos',
          snapshotData,
          createdAt: new Date(),
          product,
          operator: admin,
        }),
      );
    }
    console.log(`  ✓ Products: ${PRODUCTS.length} (with locations + minimums)`);

    // 4) Client groups
    const groupRepo = qr.manager.getRepository(ClientGroupEntity);
    const groups = new Map<string, ClientGroupEntity>();
    groups.set(
      'Empresas',
      await groupRepo.save(groupRepo.create({ name: 'Empresas', credit_limit: 500000, payment_terms: '30 días', active: true })),
    );
    groups.set(
      'Clientes Minoristas',
      await groupRepo.save(groupRepo.create({ name: 'Clientes Minoristas', credit_limit: 0, payment_terms: 'Contado', active: true })),
    );
    console.log(`  ✓ Client groups: ${groups.size}`);

    // 5) Clients (prototype clientes table: 5 minoristas + 3 empresas)
    const clientRepo = qr.manager.getRepository(ClientEntity);
    for (const c of CLIENTS) {
      await clientRepo.save(
        clientRepo.create({
          name: c.name,
          company_name: c.companyName,
          rut_raw: c.rut.raw,
          rut_normalizado: c.rut.normalized,
          address: c.address,
          city: c.city,
          phone: c.phone,
          email: c.email,
          active: true,
          group: groups.get(c.group),
        }),
      );
    }
    console.log(`  ✓ Clients: ${CLIENTS.length}`);

    // 6) Service orders (36 total: 32 históricas + ORD-1039..ORD-1042 recientes)
    const orderRepo = qr.manager.getRepository(OrderEntity);
    for (const o of [...HISTORIC_ORDERS, ...ORDERS]) {
      const client = await clientRepo.findOne({ where: { name: o.clientName } });
      if (!client) continue;
      await orderRepo.save(
        orderRepo.create({
          description: o.description,
          observation: '',
          date: new Date(now.getTime() - o.agoMs),
          status: o.status as any,
          comment: '',
          total: o.total,
          code: o.code,
          client,
        }),
      );
    }
    console.log(`  ✓ Service orders: ${HISTORIC_ORDERS.length + ORDERS.length} (ORD-1007..ORD-1042)`);

    // 7) Activity feed (prototype panel: business events)
    const logRepo = qr.manager.getRepository(LogEntity);
    for (const f of FEED) {
      await logRepo.save(logRepo.create({
        userName: 'Alejandro Martínez',
        clientId: 0,
        clientName: f.clientName,
        action: f.action,
        date: minutesAgo(f.minutesAgo),
      } as any));
    }
    console.log(`  ✓ Activity feed: ${FEED.length} entries`);

    // 8) Refill history (prototype reposiciones: product, qty, provider)
    const refillRepo = qr.manager.getRepository(RefillGroupEntity);
    for (const r of REFILLS) {
      const product = await productRepo.findOne({ where: { name: r.productName } });
      if (!product) continue;
      const group = await refillRepo.save(
        refillRepo.create({
          totalValue: r.qty * r.cost,
          createdAt: daysAgo(r.daysAgo),
          operator: bodega,
        }),
      );
      await txRepo.save(
        txRepo.create({
          operation: 'Entrada Producto',
          quantity: r.qty,
          costPrice: r.cost,
          location: product.transactions?.[0]?.location ?? 'A1-01',
          payMethod: 'Transferencia',
          finalStock: (product.stock ?? 0) + r.qty,
          description: r.provider,
          snapshotData: { name: product.name, quantity: r.qty, costPrice: r.cost },
          createdAt: daysAgo(r.daysAgo),
          product,
          operator: bodega,
          refillGroup: group,
        }),
      );
    }
    console.log(`  ✓ Refill history: ${REFILLS.length} groups (with providers)`);

    // 9) Sales (panel KPI "Ventas de hoy" $412.900, yesterday $367.350)
    const saleRepo = qr.manager.getRepository(SaleEntity);
    const sales = [
      ...SALES_TODAY.map((s) => ({ total: s.total, createdAt: minutesAgo(s.minutesAgo), productName: s.productName, qty: -1 })),
      ...SALES_YESTERDAY.map((s) => ({ total: s.total, createdAt: daysAgo(s.daysAgo), productName: s.productName, qty: -2 })),
    ];
    for (const s of sales) {
      const product = await productRepo.findOne({ where: { name: s.productName } });
      const sale = await saleRepo.save(
        saleRepo.create({
          total: s.total,
          snapshot: { items: [{ productName: s.productName, qty: Math.abs(s.qty) }] },
          createdAt: s.createdAt,
        }),
      );
      if (!product) continue;
      await txRepo.save(
        txRepo.create({
          operation: 'Venta Producto',
          quantity: s.qty,
          costPrice: 0,
          sellingPrice: s.total,
          location: product.transactions?.[0]?.location ?? 'A1-01',
          payMethod: 'Efectivo',
          finalStock: (product.stock ?? 0) + s.qty,
          description: 'Venta demo',
          snapshotData: { name: product.name, total: s.total },
          createdAt: s.createdAt,
          product,
          operator: clerk,
          sale,
        }),
      );
    }
    console.log(`  ✓ Sales: ${sales.length} (today $412.900 / yesterday $367.350)`);

    // --- Workers: global pool for the Repuestos tab (synthetic) ---
    const workerRepo = qr.manager.getRepository(WorkerEntity);
    const workerNames = ['Jorge Morales', 'Paula Soto', 'Ricardo Verde'];
    for (const name of workerNames) {
      await workerRepo.save(workerRepo.create({ name }));
    }
    console.log(`  ✓ Workers: ${workerNames.length} (Repuestos tab pool)`);

    console.log('\n✅ Demo seed complete.');
    console.log('   Login: admin@demo.example / Demo1234!');
    console.log('          clerk@demo.example / Demo1234!');
    console.log('          bodega@demo.example / Demo1234!');
  } catch (error) {
    console.error('✗ Seed failed:', error);
    throw error;
  } finally {
    await qr.release();
    await ds.destroy();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
