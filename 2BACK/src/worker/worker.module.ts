import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkerEntity } from '../entities/worker.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { StockService } from '../product/stock.service';
import { WorkerController } from './worker.controller';
import { WorkerService } from './worker.service';
import { LogModule } from '../log/log.module';

@Module({
  imports: [TypeOrmModule.forFeature([WorkerEntity, TransactionEntity]), LogModule],
  controllers: [WorkerController],
  providers: [WorkerService, StockService],
})
export class WorkerModule {}
