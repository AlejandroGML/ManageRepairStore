import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { TransactionEntity } from '../entities/transaction.entity';
import { ProductEntity } from '../entities/product.entity';
import { UserEntity } from '../entities/user.entity';
import { TransactionFront } from '../dto/transaction.front.dto';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,

    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  // Obtener todas las transacciones
  async getAllTransactions(): Promise<TransactionEntity[]> {
    return await this.transactionRepository.find({
      relations: { product: true, operator: true, manager: true },
    });
  }

  // Buscar transacción por ID
  async findById(id: number): Promise<TransactionEntity> {
    const transaction = await this.transactionRepository.findOne({
      where: { id, deleted: false },
      relations: { product: true, operator: true, manager: true },
    });
    if (!transaction) {
      throw new HttpException(`Transaction with ID ${id} not found`, HttpStatus.NOT_FOUND);
    }
    return transaction;
  }

  // Obtener transacciones de un producto por su ID
  async getTransactionsByProductId(id: number, deleted: boolean): Promise<TransactionEntity[]> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new HttpException(`Product with ID ${id} not found`, HttpStatus.NOT_FOUND);
    }

    return await this.transactionRepository.find({
      where: { product: { id }, deleted },
      relations: { product: true },
      order: { createdAt: 'DESC' },
    });
  }

   // Filtrar transacciones por assignedWorker
   async getTransactionsByAssignedWorker(assignedWorker: string): Promise<TransactionEntity[]> {
    return await this.transactionRepository.find({
      where: { assignedWorker: ILike(`%${assignedWorker}%`), deleted: false },
      relations: { product: true, operator: true, manager: true }, // Cargar las relaciones necesarias
      order: { createdAt: 'DESC' },
    });
  }


  // Crear una nueva transacción
  async createTransaction(transactionFront: TransactionFront): Promise<TransactionEntity> {
    const product = await this.productRepository.findOne({ where: { id: transactionFront.productId } });
    if (!product) {
      throw new HttpException(`Product with ID ${transactionFront.productId} not found`, HttpStatus.NOT_FOUND);
    }

    let operator: UserEntity | null = null;
    if (transactionFront.operator) {
      operator = await this.userRepository.findOne({ where: { name: transactionFront.operator } });
      if (!operator) {
        throw new HttpException(`Operator with name ${transactionFront.operator} not found`, HttpStatus.NOT_FOUND);
      }
    }

    let manager: UserEntity | null = null;
    if (transactionFront.manager) {
      manager = await this.userRepository.findOne({ where: { name: transactionFront.manager } });
      if (!manager) {
        throw new HttpException(`Manager with name ${transactionFront.manager} not found`, HttpStatus.NOT_FOUND);
      }
    }

    const transaction = this.transactionRepository.create({
      operation: transactionFront.operation,
      createdAt: transactionFront.createdAt,
      quantity: transactionFront.quantity,
      costPrice: transactionFront.costPrice,
      sellingPrice: transactionFront.sellingPrice,
      maxDiscount: transactionFront.maxDiscount,
      location: transactionFront.location,
      finalStock: transactionFront.finalStock,
      purchaseDiscount: transactionFront.purchaseDiscount,
      finalValue: transactionFront.finalValue,
      operator,
      manager,
      assignedWorker: transactionFront.assignedWorker,
      description: transactionFront.description,
      deleted: transactionFront.deleted,
      product,
    });

    return await this.transactionRepository.save(transaction);
  }

  // Actualizar una transacción existente
  async updateTransaction(id: number, transactionFront: TransactionFront): Promise<TransactionEntity> {
    const dbTransaction = await this.transactionRepository.findOne({ where: { id, deleted: false } });
    if (!dbTransaction) {
      throw new HttpException(`Transaction with ID ${id} not found`, HttpStatus.NOT_FOUND);
    }

    // Actualizar los datos de la transacción
    dbTransaction.operation = transactionFront.operation;
    dbTransaction.quantity = transactionFront.quantity;
    dbTransaction.costPrice = transactionFront.costPrice;
    dbTransaction.sellingPrice = transactionFront.sellingPrice;
    dbTransaction.maxDiscount = transactionFront.maxDiscount;
    dbTransaction.location = transactionFront.location;
    dbTransaction.finalStock = transactionFront.finalStock;
    dbTransaction.purchaseDiscount = transactionFront.purchaseDiscount;
    dbTransaction.finalValue = transactionFront.finalValue;
    dbTransaction.assignedWorker = transactionFront.assignedWorker;
    dbTransaction.description = transactionFront.description;

    return await this.transactionRepository.save(dbTransaction);
  }

  // Eliminar una transacción (soft delete)
  async deleteTransaction(id: number): Promise<void> {
    const transaction = await this.transactionRepository.findOne({ where: { id } });
    if (!transaction) {
      throw new HttpException(`Transaction with ID ${id} not found`, HttpStatus.NOT_FOUND);
    }

    // Marcar la transacción como eliminada
    transaction.deleted = true;
    await this.transactionRepository.save(transaction);
  }

  // Restaurar una transacción eliminada
  async restoreTransaction(id: number): Promise<TransactionEntity> {
    const transaction = await this.transactionRepository.findOne({ where: { id, deleted: true } });
    if (!transaction) {
      throw new HttpException(`Deleted transaction with ID ${id} not found`, HttpStatus.NOT_FOUND);
    }

    // Restaurar la transacción
    transaction.deleted = false;
    return await this.transactionRepository.save(transaction);
  }
}
