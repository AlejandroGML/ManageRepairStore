import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogEntity } from '../entities/log.entity';
import { LogController } from './log.controller';
import { LogService } from './log.service';

@Module({
  imports: [TypeOrmModule.forFeature([LogEntity])],
  controllers: [LogController],
  providers: [LogService],
  exports: [LogService],
})
export class LogModule {}
