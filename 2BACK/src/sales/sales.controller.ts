import { Controller, Post, Get, Body, Req, Res, HttpCode } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { SalesService } from './sales.service';
import { SalePdfService } from './sale-pdf.service';
import { SalePdfDto } from './dto/sale-pdf.dto';
import { TransactionEntity } from '../entities/transaction.entity';
import { SaleEntity } from '../entities/sale.entity';
import { LogEntity } from '../entities/log.entity';
import { LogService } from '../log/log.service';

@Controller('sales')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly salePdfService: SalePdfService,
    private readonly logService: LogService,
  ) {}

  @Get()
  async listSales(): Promise<SaleEntity[]> {
    return this.salesService.listSales();
  }

  @Post()
  async createSale(@Body() saleData: { transactions?: TransactionEntity[], total: number }) {
    const { transactions = [], total } = saleData;
    return this.salesService.createSale(transactions, total);
  }

  @Post('/batch')
  @ApiOperation({ summary: 'Atomic batch sale; logs activity for the authenticated user' })
  async createSaleBatch(
    @Req() req: any,
    @Body() body: {
      products: Array<{
        productId: number;
        quantity: number;
        sellingPrice: number;
        purchaseDiscount?: number;
        location?: string;
        description?: string;
      }>;
      total: number;
    },
  ): Promise<SaleEntity> {
    const sale = await this.salesService.createSaleBatch(body);
    // Fire-and-forget: a log failure must not fail the sale itself.
    this.logService
      .createLog({
        userName: req.user?.name ?? 'Sistema',
        clientId: 0,
        clientName: `${body.products.length} producto(s)`,
        action: 'Venta',
      } as LogEntity)
      .catch((err) => console.error('Failed to write sale log', err));
    return sale;
  }

  /** Comprobante PDF de venta (mismo diseño que la orden, Puppeteer). */
  @Post('/pdf')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate a sale receipt PDF from the cart summary' })
  async generateSalePdf(@Body() dto: SalePdfDto, @Res() res: Response): Promise<void> {
    const buffer = await this.salePdfService.generateSalePdf(dto);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${dto.code || 'venta'}.pdf"`);
    res.send(buffer);
  }
}
