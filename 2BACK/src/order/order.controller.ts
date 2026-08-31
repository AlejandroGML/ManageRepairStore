import { Body, Controller, Get, Param, Post, UsePipes, ValidationPipe, Patch, Header, Res } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { OrderService } from './order.service';
import { OrderMapperService } from './order.mapper.service';
import { OrderFront } from '../dto/order.front.dto';
import { ClientEntity } from '../entities/client.entity';
import { OrderExample, OrderStatusExample } from '../utils/controllers.examples';
import { OrderStatusFront } from '../dto/order.status.front.dto';
import { OrderEntity } from '../entities/order.entity';
import { OrderPdfDto } from '../dto/order-pdf.dto';
import { OrderPdfService } from './order-pdf.service';
import { Public } from '../auth/public.decorator';

@ApiTags('Order-controller')
@Controller('order')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly orderPdfService: OrderPdfService,
    private readonly orderMapperService: OrderMapperService,
  ) {}
  @Get('/all')
  @ApiResponse({ status: 200, description: 'Todos los elementos', type: [ClientEntity], isArray:true})
  @ApiOperation({ summary: 'Returns all Orders' })
  async findAll(): Promise<ClientEntity[]> {
    return this.orderService.getAllOrders();
  }

  @Get('/code/:code')
  @ApiResponse({ status: 200, description: 'Elementos filtrados por RUT y Nombre', type: [ClientEntity], isArray:true})
  @ApiOperation({ summary: 'Returns orders by RUT and Name' })
  async getOrdersByCode(@Param('code') code: string): Promise<ClientEntity | null> {
    return this.orderService.getOrdersByCode(code);
  }

  @Get('/user/:id')
  @ApiResponse({ status: 200, description: 'Obtener ordenes de un usuario', type: [ClientEntity], isArray:true})
  @ApiOperation({ summary: 'Obtener ordenes de un usuario' })
  async getOrderByUserId(@Param('id') id: string): Promise<ClientEntity | null> {
    return this.orderService.getClientByUserId(id);
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false }))
  @ApiBody({ type: OrderFront, examples: OrderExample })
  @ApiCreatedResponse({ description: 'Create a new entry order.'})
  @ApiOperation({ summary: 'Create a new entry order' })
  async create(@Body() newOrder: OrderFront): Promise<ClientEntity> {
    return this.orderService.registerClientOrder(this.orderMapperService.mapToClientEntity(newOrder));
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false }))
  @ApiBody({ type: OrderFront, examples: OrderExample })
  @ApiOkResponse({ description: 'Update a entry order.'})
  @ApiOperation({ summary: 'Update a entry order' })
  async update(@Param() value: any, @Body() newOrder: OrderFront): Promise<OrderEntity | null> {
    return this.orderService.updateOrder(Number(value.id), this.orderMapperService.mapToOrderEntity(newOrder));
  }

  @Patch('/status/:id')
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false }))
  @ApiBody({ type: OrderStatusFront, examples: OrderStatusExample })
  @ApiOkResponse({ description: 'Update a status entry order.'})
  @ApiOperation({ summary: 'Update a status entry order' })
  async updateStatus(@Param() value: any, @Body() newOrder: OrderStatusFront): Promise<OrderEntity | null> {
    return this.orderService.updateOrder(Number(value.id), this.orderMapperService.mapToOrderStatusEntity(newOrder));
  }

  @Public()
  @Post('/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment')
  @ApiOperation({ summary: 'Generate PDF for an order' })
  async generatePdf(@Body() data: OrderPdfDto, @Res() res: Response): Promise<void> {
    // Normalize date: if it's an ISO string, format it to dd-MM-yyyy hh:mm
    if (data.date) {
      try {
        const d = new Date(data.date);
        if (!isNaN(d.getTime())) {
          const pad = (n: number) => String(n).padStart(2, '0');
          data.date = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }
      } catch { /* keep original */ }
    }

    const pdfBuffer = await this.orderPdfService.generateOrderPdf(data);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Orden_${data.code}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });
    res.end(pdfBuffer);
  }
}
