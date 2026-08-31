import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleEntity } from '../entities/sale.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { ProductModule } from '../product/product.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [TypeOrmModule.forFeature([SaleEntity, TransactionEntity]), ProductModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
