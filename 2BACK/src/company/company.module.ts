import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyEntity } from '../entities/company.entity';
import { ClientEntity } from '../entities/client.entity';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyEntity, ClientEntity])],
  controllers: [CompanyController],
  providers: [CompanyService],
})
export class CompanyModule {}
