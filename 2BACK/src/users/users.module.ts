import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { LogModule } from '../log/log.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), LogModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
