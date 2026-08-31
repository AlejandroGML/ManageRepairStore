import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientEntity } from '../entities/client.entity';
import { ClientGroupEntity } from '../entities/client-group.entity';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClientEntity, ClientGroupEntity])],
  controllers: [ClientController],
  providers: [ClientService],
})
export class ClientModule {}
