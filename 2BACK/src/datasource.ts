import { DataSource } from 'typeorm';
import { ClientEntity } from './entities/client.entity';
import { ClientGroupEntity } from './entities/client-group.entity';
import { OrderEntity } from './entities/order.entity';
import { UserEntity } from './entities/user.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { ProductEntity } from './entities/product.entity';
import { CategoryEntity } from './entities/category.entity';
import { SaleEntity } from './entities/sale.entity';
import { LogEntity } from './entities/log.entity';
import { RefillGroupEntity } from './entities/refill-group.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'mrs_demo_local',
  database: process.env.DB_DATABASE || 'manage_repair_store',
  entities: [
    ClientEntity,
    ClientGroupEntity,
    OrderEntity,
    UserEntity,
    TransactionEntity,
    ProductEntity,
    CategoryEntity,
    SaleEntity,
    LogEntity,
    RefillGroupEntity,
  ],
  synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true' || process.env.NODE_ENV !== 'production',
});
