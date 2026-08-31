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
  { name: 'pantalla iphone 11', category: 'Pantallas', stock: 12, costPrice: 18000, sellingPrice: 28000 },
  { name: 'pantalla samsung a54', category: 'Pantallas', stock: 8, costPrice: 22000, sellingPrice: 32000 },
  { name: 'pantalla motorola g54', category: 'Pantallas', stock: 10, costPrice: 15000, sellingPrice: 24000 },
  { name: 'pantalla xiaomi redmi note 12', category: 'Pantallas', stock: 6, costPrice: 14000, sellingPrice: 22000 },
  { name: 'batería iphone 12', category: 'Baterías', stock: 15, costPrice: 9000, sellingPrice: 15000 },
  { name: 'batería samsung s22', category: 'Baterías', stock: 9, costPrice: 11000, sellingPrice: 18000 },
  { name: 'batería xiaomi redmi 10', category: 'Baterías', stock: 14, costPrice: 7000, sellingPrice: 12000 },
  { name: 'batería huawei p30', category: 'Baterías', stock: 7, costPrice: 8000, sellingPrice: 13000 },
  { name: 'conector de carga usb-c', category: 'Conectores', stock: 25, costPrice: 2500, sellingPrice: 5000 },
  { name: 'conector de carga lightning', category: 'Conectores', stock: 20, costPrice: 3000, sellingPrice: 6000 },
  { name: 'pines de carga samsung', category: 'Conectores', stock: 18, costPrice: 2000, sellingPrice: 4500 },
  { name: 'flex de carga motorola', category: 'Conectores', stock: 11, costPrice: 2200, sellingPrice: 4800 },
  { name: 'cable usb-c trenzado 1m', category: 'Accesorios', stock: 40, costPrice: 1200, sellingPrice: 3500 },
  { name: 'cargador 20w usb-c', category: 'Accesorios', stock: 30, costPrice: 5000, sellingPrice: 9000 },
  { name: 'audífonos bluetooth básicos', category: 'Accesorios', stock: 22, costPrice: 6000, sellingPrice: 10000 },
  { name: 'funda silicona universal', category: 'Accesorios', stock: 35, costPrice: 800, sellingPrice: 2500 },
  { name: 'kit destornilladores precisión', category: 'Herramientas', stock: 5, costPrice: 9500, sellingPrice: 16000 },
  { name: 'estación de calor', category: 'Herramientas', stock: 3, costPrice: 35000, sellingPrice: 55000 },
  { name: 'ventosa de succión', category: 'Herramientas', stock: 16, costPrice: 1800, sellingPrice: 4000 },
  { name: 'cinta adhesiva b7000', category: 'Herramientas', stock: 28, costPrice: 900, sellingPrice: 2200 },
  { name: 'tapa trasera iphone 11', category: 'Repuestos', stock: 9, costPrice: 6000, sellingPrice: 11000 },
  { name: 'tapa trasera samsung a54', category: 'Repuestos', stock: 8, costPrice: 5500, sellingPrice: 10000 },
  { name: 'vidrio cámara iphone 12', category: 'Repuestos', stock: 13, costPrice: 2500, sellingPrice: 6000 },
  { name: 'módulo cámara xiaomi', category: 'Repuestos', stock: 6, costPrice: 10000, sellingPrice: 17000 },
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
      userRepo.create({ name: 'Administrador', email: 'admin@demo.example', passwordHash, role: 'admin', active: true }),
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
