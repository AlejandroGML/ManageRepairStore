import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientEntity } from '../entities/client.entity';
import { CompanyEntity } from '../entities/company.entity';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClientEntity, CompanyEntity])],
  controllers: [ClientController],
  providers: [ClientService],
})
export class ClientModule {}
