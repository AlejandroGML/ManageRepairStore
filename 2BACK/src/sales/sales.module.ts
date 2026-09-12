import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleEntity } from '../entities/sale.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { ProductModule } from '../product/product.module';
import { LogModule } from '../log/log.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalePdfService } from './sale-pdf.service';

@Module({
  imports: [TypeOrmModule.forFeature([SaleEntity, TransactionEntity]), ProductModule, LogModule],
  controllers: [SalesController],
  providers: [SalesService, SalePdfService],
})
export class SalesModule {}
