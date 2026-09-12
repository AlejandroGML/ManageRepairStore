import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkerEntity } from '../entities/worker.entity';
import { WorkerService } from './worker.service';
import { LogService } from '../log/log.service';
import { LogEntity } from '../entities/log.entity';

@ApiTags('Worker-controller')
@Controller('worker')
export class WorkerController {
  constructor(
    private readonly workerService: WorkerService,
    private readonly logService: LogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List workers (global pool)' })
  list(): Promise<WorkerEntity[]> {
    return this.workerService.list();
  }

  @Post()
  @ApiOperation({ summary: 'Create a worker (name only for now)' })
  create(@Body() body: { name: string }): Promise<WorkerEntity> {
    return this.workerService.create(body?.name);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a worker (blocked if it has movements)' })
  async remove(@Param('id') id: number): Promise<{ success: boolean }> {
    await this.workerService.remove(id);
    return { success: true };
  }

  @Get(':id/balance')
  @ApiOperation({ summary: 'Assigned spare-parts balance per product for a worker' })
  balance(@Param('id') id: number) {
    return this.workerService.getBalance(id);
  }

  @Post('movements')
  @ApiOperation({ summary: 'Atomic batch of worker spare-part movements (assign/return)' })
  async createMovements(
    @Req() req: any,
    @Body()
    body: {
      workerId: number;
      products: Array<{ productId: number; quantity: number }>;
      detail?: string;
    },
  ) {
    const result = await this.workerService.createMovements(
      body?.workerId,
      body?.products ?? [],
      body?.detail,
    );
    // Actividad reciente del panel (fire-and-forget, como refills).
    const products = body?.products ?? [];
    const hasPos = products.some((p) => p.quantity > 0);
    const hasNeg = products.some((p) => p.quantity < 0);
    const action =
      hasPos && hasNeg ? 'Repuestos' : hasNeg ? 'Repuestos: devolución' : 'Repuestos: asignación';
    this.logService
      .createLog({
        userName: req.user?.name ?? 'Sistema',
        clientId: 0,
        clientName: `${result.workerName} · ${result.created} producto(s)`,
        action,
      } as LogEntity)
      .catch((err) => console.error('Failed to write worker-movement log', err));
    return result;
  }

  @Get('movements')
  @ApiOperation({ summary: 'Paginated worker movements history (optionally per worker)' })
  movements(
    @Query('limit') limit: string = '20',
    @Query('offset') offset: string = '0',
    @Query('workerId') workerId?: string,
  ) {
    return this.workerService.getMovements(
      Number(limit) || 20,
      Math.max(Number(offset) || 0, 0),
      workerId ? Number(workerId) : undefined,
    );
  }
}
