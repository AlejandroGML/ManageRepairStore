import { Controller, Get, Post, Body, UsePipes, ValidationPipe} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation, ApiBody } from '@nestjs/swagger';
import { LogEntity } from '../entities/log.entity';
import { LogService } from './log.service';
import { LogExample } from '../utils/controllers.examples';


@ApiTags('Log-controller')
@Controller('log')
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Get('/data')
  @ApiResponse({ status: 200, description: 'Returns all logs.'})
  @ApiOperation({ summary: 'Get all logs' })
  async getAllLogs(): Promise<LogEntity[]> {
    return this.logService.getAllLogs();
  }

  @Post()
  @UsePipes(new ValidationPipe())
  @ApiBody({ type: LogEntity, examples: LogExample })
  @ApiResponse({ status: 201, description: 'Creates a new Log.'})
  @ApiOperation({ summary: 'New Log Created.' })
  async createLog(@Body() log: LogEntity): Promise<LogEntity> {
    return await  this.logService.createLog(log);
  }


}