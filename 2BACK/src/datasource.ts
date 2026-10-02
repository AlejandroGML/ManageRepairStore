import { DataSource } from 'typeorm';
import { ClientEntity } from './entities/client.entity';
import { CompanyEntity } from './entities/company.entity';
import { OrderEntity } from './entities/order.entity';
import { UserEntity } from './entities/user.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { ProductEntity } from './entities/product.entity';
import { CategoryEntity } from './entities/category.entity';
import { SaleEntity } from './entities/sale.entity';
import { LogEntity } from './entities/log.entity';
import { RefillGroupEntity } from './entities/refill-group.entity';
import { WorkerEntity } from './entities/worker.entity';

/**
 * CLI data source (typeorm migration:generate/run/revert/show).
 *
 * Exactly ONE DataSource binding lives here — typeorm 1.0's CLI rejects
 * files exporting more than one.
 *
 * Migrations are the ONLY schema path: synchronize is off in every
 * environment (entity edits never auto-ALTER anything; generate the
 * migration instead). The demo database adopts its schema the same way;
 * the demo reset (POST /demo/reset) is data seeding and stays outside
 * the migration system.
 *
 * Credentials come from the DB_* environment (same variables the app
 * reads); defaults match the dev docker-compose stack. Point the CLI at
 * a different target with DB_DATABASE=x.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'mrs_demo_local',
  database: process.env.DB_DATABASE || 'manage_repair_store',
  entities: [
    ClientEntity,
    CompanyEntity,
    OrderEntity,
    UserEntity,
    TransactionEntity,
    ProductEntity,
    CategoryEntity,
    SaleEntity,
    LogEntity,
    RefillGroupEntity,
    WorkerEntity,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsRun: false,
  synchronize: false,
});
