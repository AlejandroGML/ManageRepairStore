import { Controller, ForbiddenException, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { DemoService } from './demo.service';

@ApiTags('Demo-controller')
@Controller('demo')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Public()
  @Post('reset')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset demo data to the original synthetic seed (ephemeral demo)' })
  async reset(): Promise<{ resetAt: string }> {
    if (!this.demoService.enabled) {
      throw new ForbiddenException('Demo mode is disabled');
    }
    return this.demoService.reset();
  }
}
