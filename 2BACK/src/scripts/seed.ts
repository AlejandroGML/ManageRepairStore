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
import { calcularDV } from '../services/rut.service';

/**
 * Demo seed — 100% synthetic data for the Manage Repair Store portfolio demo.
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
  costPrice: number;
  sellingPrice: number;
}

const PRODUCTS: DemoProduct[] = [
  { name: 'Pantalla iPhone 11', category: 'Pantallas', stock: 12, costPrice: 18000, sellingPrice: 28000 },
  { name: 'Pantalla Samsung A54', category: 'Pantallas', stock: 8, costPrice: 22000, sellingPrice: 32000 },
  { name: 'Pantalla Motorola G54', category: 'Pantallas', stock: 10, costPrice: 15000, sellingPrice: 24000 },
  { name: 'Pantalla Xiaomi Redmi Note 12', category: 'Pantallas', stock: 6, costPrice: 14000, sellingPrice: 22000 },
  { name: 'Batería iPhone 12', category: 'Baterías', stock: 15, costPrice: 9000, sellingPrice: 15000 },
  { name: 'Batería Samsung S22', category: 'Baterías', stock: 9, costPrice: 11000, sellingPrice: 18000 },
  { name: 'Batería Xiaomi Redmi 10', category: 'Baterías', stock: 14, costPrice: 7000, sellingPrice: 12000 },
  { name: 'Batería Huawei P30', category: 'Baterías', stock: 7, costPrice: 8000, sellingPrice: 13000 },
  { name: 'Conector de carga USB-C', category: 'Conectores', stock: 25, costPrice: 2500, sellingPrice: 5000 },
  { name: 'Conector de carga Lightning', category: 'Conectores', stock: 20, costPrice: 3000, sellingPrice: 6000 },
  { name: 'Pines de carga Samsung', category: 'Conectores', stock: 18, costPrice: 2000, sellingPrice: 4500 },
  { name: 'Flex de carga Motorola', category: 'Conectores', stock: 11, costPrice: 2200, sellingPrice: 4800 },
  { name: 'Cable USB-C trenzado 1m', category: 'Accesorios', stock: 40, costPrice: 1200, sellingPrice: 3500 },
  { name: 'Cargador 20W USB-C', category: 'Accesorios', stock: 30, costPrice: 5000, sellingPrice: 9000 },
  { name: 'Audífonos Bluetooth básicos', category: 'Accesorios', stock: 22, costPrice: 6000, sellingPrice: 10000 },
  { name: 'Funda silicona universal', category: 'Accesorios', stock: 35, costPrice: 800, sellingPrice: 2500 },
  { name: 'Kit destornilladores precisión', category: 'Herramientas', stock: 5, costPrice: 9500, sellingPrice: 16000 },
  { name: 'Estación de calor', category: 'Herramientas', stock: 3, costPrice: 35000, sellingPrice: 55000 },
  { name: 'Ventosa de succión', category: 'Herramientas', stock: 16, costPrice: 1800, sellingPrice: 4000 },
  { name: 'Cinta adhesiva B7000', category: 'Herramientas', stock: 28, costPrice: 900, sellingPrice: 2200 },
  { name: 'Tapa trasera iPhone 11', category: 'Repuestos', stock: 9, costPrice: 6000, sellingPrice: 11000 },
  { name: 'Tapa trasera Samsung A54', category: 'Repuestos', stock: 8, costPrice: 5500, sellingPrice: 10000 },
  { name: 'Vidrio cámara iPhone 12', category: 'Repuestos', stock: 13, costPrice: 2500, sellingPrice: 6000 },
  { name: 'Módulo cámara Xiaomi', category: 'Repuestos', stock: 6, costPrice: 10000, sellingPrice: 17000 },
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
  {
    name: 'Comercial Demo SpA',
    companyName: 'Comercial Demo SpA',
    rut: makeRut('76034512'),
    address: 'Av. Providencia 1234',
    city: 'Providencia',
    phone: '+56 9 5555 1001',
    email: 'contacto@comercialdemo.example',
    group: 'Empresas',
  },
  {
    name: 'María Fernández',
    rut: makeRut('15876543'),
    address: 'Calle Los Cerezos 45',
    city: 'Ñuñoa',
    phone: '+56 9 5555 1002',
    email: 'maria.fernandez@demo.example',
    group: 'Clientes Minoristas',
  },
  {
    name: 'Taller Express Ltda',
    companyName: 'Taller Express Ltda',
    rut: makeRut('77123456'),
    address: 'Av. Irarrázaval 2890',
    city: 'Ñuñoa',
    phone: '+56 9 5555 1003',
    email: 'ventas@tallerexpress.example',
    group: 'Empresas',
  },
  {
    name: 'Juan Pérez',
    rut: makeRut('20456789'),
    address: 'Pasaje Los Aromos 8',
    city: 'La Florida',
    phone: '+56 9 5555 1004',
    email: 'juan.perez@demo.example',
    group: 'Clientes Minoristas',
  },
  {
    name: 'Electro Sur SpA',
    companyName: 'Electro Sur SpA',
    rut: makeRut('76987654'),
    address: 'Av. Vicuña Mackenna 6100',
    city: 'La Florida',
    phone: '+56 9 5555 1005',
    email: 'compras@electrosur.example',
    group: 'Empresas',
  },
  {
    name: 'Ana Gutiérrez',
    rut: makeRut('12345678'),
    address: 'Av. Providencia 987',
    city: 'Providencia',
    phone: '+56 9 5555 1006',
    email: 'ana.gutierrez@demo.example',
    group: 'Clientes Minoristas',
  },
  {
    name: 'Distribuidora Central SpA',
    companyName: 'Distribuidora Central SpA',
    rut: makeRut('99555666'),
    address: 'Av. Matta 350',
    city: 'Santiago',
    phone: '+56 9 5555 1007',
    email: 'contacto@distribuidoracentral.example',
    group: 'Empresas',
  },
  {
    name: 'Pedro Soto',
    rut: makeRut('76111222'),
    address: 'Calle Los Plátanos 120',
    city: 'Santiago',
    phone: '+56 9 5555 1008',
    email: 'pedro.soto@demo.example',
    group: 'Clientes Minoristas',
  },
];

async function seed() {
  const ds = AppDataSource;
  await ds.initialize();
  const qr = ds.createQueryRunner();
  await qr.connect();

  try {
    console.log('🌱 Seeding Manage Repair Store demo data (synthetic only)...');

    await qr.query(
      `TRUNCATE TABLE refill_groups, transaction_entity, order_entity, sales,
       client_entity, product_entity, category_entity, client_group_entity,
       user_entity, log_entity RESTART IDENTITY CASCADE`,
    );

    // 1) Users
    const userRepo = qr.manager.getRepository(UserEntity);
    const passwordHash = await bcrypt.hash('Demo1234!', 12);
    const admin = await userRepo.save(
      userRepo.create({ name: 'Alejandro Martínez', email: 'admin@demo.example', passwordHash, role: 'admin', active: true }),
    );
    const clerk = await userRepo.save(
      userRepo.create({ name: 'Vendedor Demo', email: 'clerk@demo.example', passwordHash, role: 'seller', active: true }),
    );
    const bodega = await userRepo.save(
      userRepo.create({ name: 'Bodega Demo', email: 'bodega@demo.example', passwordHash, role: 'warehouse', active: true }),
    );
    console.log(`  ✓ Users: ${admin.email}, ${clerk.email}, ${bodega.email} (password: Demo1234!)`);

    // 2) Categories
    const categoryRepo = qr.manager.getRepository(CategoryEntity);
    const categories = new Map<string, CategoryEntity>();
    for (const name of CATEGORIES) {
      categories.set(name, await categoryRepo.save(categoryRepo.create({ name })));
    }
    console.log(`  ✓ Categories: ${CATEGORIES.length}`);

    // 3) Products + initial "Nuevo Producto" transactions (prices in CLP)
    const productRepo = qr.manager.getRepository(ProductEntity);
    const txRepo = qr.manager.getRepository(TransactionEntity);
    for (const p of PRODUCTS) {
      const product = await productRepo.save(
        productRepo.create({ name: p.name, stock: p.stock, active: true, category: categories.get(p.category) }),
      );
      const snapshotData = {
        name: p.name,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        location: 'Bodega Central Demo',
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
          location: 'Bodega Central Demo',
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
    console.log(`  ✓ Products: ${PRODUCTS.length}`);

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

    // 5) Clients (synthetic valid RUTs via módulo 11)
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
    console.log(`  ✓ Clients: ${CLIENTS.length} (valid synthetic RUTs)`);

    // 6) Recent activity logs (synthetic)
    const logRepo = qr.manager.getRepository(LogEntity);
    const now = new Date();
    const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000);
    const recentLogs = [
      { userName: 'Alejandro Martínez', clientId: 1, clientName: 'Comercial Demo SpA', action: 'registró orden de ingreso', date: hoursAgo(2) },
      { userName: 'Vendedor Demo', clientId: 4, clientName: 'Juan Pérez', action: 'realizó venta de 2 productos', date: hoursAgo(5) },
      { userName: 'Bodega Demo', clientId: 0, clientName: '—', action: 'repuso stock: Pantalla iPhone 11', date: hoursAgo(9) },
      { userName: 'Alejandro Martínez', clientId: 2, clientName: 'María Fernández', action: 'editó datos de cliente', date: hoursAgo(26) },
      { userName: 'Vendedor Demo', clientId: 3, clientName: 'Taller Express Ltda', action: 'registró orden de ingreso', date: hoursAgo(48) },
    ];
    for (const l of recentLogs) {
      await logRepo.save(logRepo.create({ ...l, createdAt: l.date } as any));
    }
    console.log(`  ✓ Recent activity logs: ${recentLogs.length}`);

    // 7) Refill history (synthetic refill groups)
    const refillRepo = qr.manager.getRepository(RefillGroupEntity);
    const refills = [
      { productName: 'Pantalla iPhone 11', qty: 10, cost: 18000, hours: 20 },
      { productName: 'Batería Samsung S22', qty: 6, cost: 11000, hours: 44 },
      { productName: 'Conector de carga USB-C', qty: 25, cost: 2500, hours: 68 },
      { productName: 'Cinta adhesiva B7000', qty: 15, cost: 900, hours: 92 },
    ];
    for (const r of refills) {
      const product = await productRepo.findOne({ where: { name: r.productName } });
      if (!product) continue;
      const group = await refillRepo.save(
        refillRepo.create({
          totalValue: r.qty * r.cost,
          createdAt: hoursAgo(r.hours),
          operator: bodega,
        }),
      );
      await txRepo.save(
        txRepo.create({
          operation: 'Entrada Producto',
          quantity: r.qty,
          costPrice: r.cost,
          location: 'Bodega Central Demo',
          payMethod: 'Transferencia',
          finalStock: (product.stock ?? 0) + r.qty,
          description: 'Reposición de stock',
          snapshotData: { name: product.name, quantity: r.qty, costPrice: r.cost },
          createdAt: hoursAgo(r.hours),
          product,
          operator: bodega,
          refillGroup: group,
        }),
      );
    }
    console.log(`  ✓ Refill history: ${refills.length} groups`);

    console.log('\n✅ Demo seed complete.');
    console.log('   Login: admin@demo.example / Demo1234!');
    console.log('          clerk@demo.example / Demo1234!');
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
