import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../entities/order.entity';
import { ClientEntity } from '../entities/client.entity';
import { CompanyEntity } from '../entities/company.entity';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderMapperService } from './order.mapper.service';
import { OrderPdfService } from './order-pdf.service';
import { LogModule } from '../log/log.module';

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity, ClientEntity, CompanyEntity]), LogModule],
  controllers: [OrderController],
  providers: [OrderService, OrderMapperService, OrderPdfService],
})
export class OrderModule {}
