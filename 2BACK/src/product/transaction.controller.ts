import { Body, Controller, Get, Param, Post, Patch, Delete, BadRequestException, UsePipes, ValidationPipe, HttpException, HttpStatus } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import { TransactionFront } from '../dto/transaction.front.dto';
import { TransactionEntity } from '../entities/transaction.entity';
import { validate } from 'class-validator'; // Asegúrate de importar validate

@ApiTags('Transaction-controller')
@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get('/all')
  @ApiOkResponse({ description: 'Get all transactions', type: [TransactionEntity] })
  @ApiOperation({ summary: 'Returns all transactions' })
  async getAllTransactions(): Promise<TransactionEntity[]> {
    return this.transactionService.getAllTransactions();
  }

  @Get('/by-id/:id')
  @ApiOkResponse({ description: 'Get transaction by ID', type: TransactionEntity })
  @ApiOperation({ summary: 'Returns a transaction by ID' })
  async getTransactionById(@Param('id') id: number): Promise<TransactionEntity> {
    return this.transactionService.findById(id);
  }

  @Post('/create')
  @UsePipes(new ValidationPipe())
  @ApiBody({ type: TransactionFront })
  @ApiCreatedResponse({ description: 'Transaction created successfully', type: TransactionEntity })
  @ApiOperation({ summary: 'Create a new transaction' })
  async createTransaction(@Body() transactionFront: TransactionFront): Promise<TransactionEntity> {
    const errors = await validate(transactionFront);  // Asegúrate de que validate esté disponible
    if (errors.length) {
      throw new BadRequestException(errors);
    }
    return this.transactionService.createTransaction(transactionFront);
  }

  @Patch('/update/:id')
  @UsePipes(new ValidationPipe())
  @ApiBody({ type: TransactionFront })
  @ApiOkResponse({ description: 'Transaction updated successfully', type: TransactionEntity })
  @ApiOperation({ summary: 'Update a transaction' })
  async updateTransaction(@Param('id') id: number, @Body() transactionFront: TransactionFront): Promise<TransactionEntity> {
    return this.transactionService.updateTransaction(id, transactionFront);
  }

  @Delete('/delete/:id')
  @ApiOkResponse({ description: 'Transaction deleted successfully' })
  @ApiOperation({ summary: 'Soft delete a transaction' })
  async deleteTransaction(@Param('id') id: number): Promise<void> {
    return this.transactionService.deleteTransaction(id);
  }

  @Patch('/restore/:id')
  @ApiOkResponse({ description: 'Transaction restored successfully', type: TransactionEntity })
  @ApiOperation({ summary: 'Restore a soft deleted transaction' })
  async restoreTransaction(@Param('id') id: number): Promise<TransactionEntity> {
    return this.transactionService.restoreTransaction(id);
  }

  // Endpoint para obtener transacciones por assignedWorker
  @Get('/by-assigned-worker/:assignedWorker')
  async getTransactionsByAssignedWorker(@Param('assignedWorker') assignedWorker: string): Promise<TransactionEntity[]> {
    const transactions = await this.transactionService.getTransactionsByAssignedWorker(assignedWorker);
    if (transactions.length === 0) {
      throw new HttpException(`No transactions found for assigned worker: ${assignedWorker}`, HttpStatus.NOT_FOUND);
    }
    return transactions;
  }

}
