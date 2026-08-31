import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogEntity } from '../entities/log.entity';

@Injectable()
export class LogService {
  constructor(
    @InjectRepository(LogEntity)
    private readonly logRepository: Repository<LogEntity>,
  ) {}

  async createLog(log: LogEntity): Promise<LogEntity> {
    log.date= new Date();
    return await this.logRepository.save(log);
  }

  async getAllLogs(): Promise<LogEntity[]> {
    try {
      return await this.logRepository.find(); 
    } catch (error) {
      console.log(error);
      return [];
    }
  }
}
