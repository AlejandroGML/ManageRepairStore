import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from '../entities/product.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { CategoryEntity } from '../entities/category.entity';
import { RefillGroupEntity } from '../entities/refill-group.entity';
import { OrderEntity } from '../entities/order.entity';
import { UserEntity } from '../entities/user.entity';
import { ProductController } from './product.controller';
import { TransactionController } from './transaction.controller';
import { ProductService } from './product.service';
import { TransactionService } from './transaction.service';
import { StockService } from './stock.service';
import { RefillService } from './refill.service';
import { LogModule } from '../log/log.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity, TransactionEntity, CategoryEntity, UserEntity, RefillGroupEntity, OrderEntity]), LogModule],
  controllers: [ProductController, TransactionController],
  providers: [ProductService, TransactionService, StockService, RefillService],
  exports: [ProductService, StockService, RefillService],
})
export class ProductModule {}
