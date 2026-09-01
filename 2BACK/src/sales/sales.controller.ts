import { Controller, Post, Body, Get } from '@nestjs/common';
import { SalesService } from './sales.service';
import { TransactionEntity } from '../entities/transaction.entity';
import { SaleEntity } from '../entities/sale.entity';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

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
  async createSaleBatch(@Body() body: {
    products: Array<{
      productId: number;
      quantity: number;
      sellingPrice: number;
      purchaseDiscount?: number;
      location?: string;
      description?: string;
    }>;
    total: number;
  }): Promise<SaleEntity> {
    return this.salesService.createSaleBatch(body);
  }
}
