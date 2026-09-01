import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProductEntity } from '../entities/product.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { StockService } from './stock.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,

    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,

    private readonly dataSource: DataSource,

    private readonly stockService: StockService,
  ) {}

   
   // Método para registrar un producto
  async registerProduct(product: ProductEntity): Promise<ProductEntity> {
    // Asegúrate de que 'transactions' es un array
    if (typeof product.transactions === 'string') {
        try {
            product.transactions = JSON.parse(product.transactions); // Parseamos si es un string
        } catch {
            throw new Error('Formato de transacción inválido'); // Si el parseo falla, lanzamos error
        }
    }

    if (!product.transactions || product.transactions.length === 0) {
        throw new Error('Se requiere al menos una transacción para registrar el producto.');
    }

    // Asigna la fecha a la primera transacción
    const transaction = product.transactions[0];
    transaction.createdAt = new Date();
    product.name = product.name.toLowerCase();

    const existingProduct = await this.productRepository.findOne({
      where: { name: product.name },
      relations: { transactions: true }, // Asegura que las transacciones se carguen
    });

    if (existingProduct) {
      // Determine delta: Nuevo Producto adds stock, other operations remove
      const isNewProduct = transaction.operation === 'Nuevo Producto';
      const quantity = Number(transaction.quantity) || 0;
      const delta = isNewProduct ? Math.abs(quantity) : -Math.abs(quantity);

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const { newStock } = await this.stockService.mutateStock(queryRunner, existingProduct.id!, delta);

        const newTransaction = this.transactionRepository.create({
          operation: transaction.operation || 'Nuevo Producto',
          quantity: transaction.quantity ?? 0,
          costPrice: transaction.costPrice ?? 0,
          sellingPrice: transaction.sellingPrice ?? 0,
          location: transaction.location || 'Sin Datos',
          payMethod: transaction.payMethod || 'Sin Datos',
          finalStock: newStock,
          maxDiscount: transaction.maxDiscount ?? 0,
          purchaseDiscount: transaction.purchaseDiscount ?? 0,
          description: transaction.description || 'Sin Datos',
          assignedWorker: transaction.assignedWorker || 'Sin Datos',
          snapshotData: {
            name: existingProduct.name,
            image: existingProduct.image || '',
            createdAt: transaction.createdAt,
            costPrice: transaction.costPrice || 0,
            sellingPrice: transaction.sellingPrice || 0,
            location: transaction.location || 'Sin Datos',
            maxDiscount: transaction.maxDiscount || 0,
            purchaseDiscount: transaction.purchaseDiscount || 0,
            payMethod: transaction.payMethod || 'Sin Datos',
            finalStock: newStock,
            description: transaction.description || 'Sin Datos',
            assignedWorker: transaction.assignedWorker || 'Sin Datos',
          },
          createdAt: new Date(),
          product: existingProduct,
        });

        await queryRunner.manager.save(newTransaction);
        await queryRunner.commitTransaction();

        // Re-fetch with relations
        return (await this.productRepository.findOne({
          where: { id: existingProduct.id },
          relations: { transactions: true },
        }))!;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } else {
      // New product: stock starts at initial quantity
      product.stock = Number(transaction.quantity ?? 0);
      transaction.finalStock = product.stock;

      const snapshotData = {
        name: product.name,
        image: product.image || '',
        quantity: transaction.quantity || 0,
        createdAt: transaction.createdAt,
        costPrice: transaction.costPrice || 0,
        sellingPrice: transaction.sellingPrice || 0,
        location: transaction.location || 'Sin Datos',
        maxDiscount: transaction.maxDiscount || 0,
        purchaseDiscount: transaction.purchaseDiscount || 0,
        payMethod: transaction.payMethod || 'Sin Datos',
        finalStock: transaction.finalStock || 0,
        finalValue: transaction.finalValue || 0,
        description: transaction.description || 'Sin Datos',
        assignedWorker: transaction.assignedWorker || 'Sin Datos',
      };

      // Asigna el snapshotData a la primera transacción
      transaction.snapshotData = snapshotData;
      
      return await this.productRepository.save(product);
    }
}

   // Traer todos los productos con active en true
   async getActiveProducts(): Promise<ProductEntity[]> {
    return await this.productRepository.find({
      where: { active: true },
      order: {id: 'DESC',}, // Orden descendente por ID
      relations: { transactions: true },
    });
  }

  // Traer todos los productos, sin importar el valor de active
  async getAllProducts(): Promise<ProductEntity[]> {
    return await this.productRepository.find({
      relations: { transactions: true },
    });
  }

  // Obtener producto por ID
  async getProductById(id: number): Promise<ProductEntity> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: { transactions: true },
    });
    if (!product) {
      throw new HttpException(`Product with ID ${id} not found`, HttpStatus.NOT_FOUND);
    }
    return product;
  }

  // Obtener productos por nombre
  async getProductsByName(name: string): Promise<ProductEntity[]> {
    return await this.productRepository
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.transactions', 'transaction')
      .where('LOWER(product.name) LIKE LOWER(:name)', { name: `%${name}%` })
      .getMany();
  }

  // Obtener productos por ubicación
  async getProductsByLocation(location: string): Promise<ProductEntity[]> {
    return await this.productRepository
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.transactions', 'transaction')
      .where('LOWER(transaction.location) LIKE LOWER(:location)', { location: `%${location}%` })
      .getMany();
  }

   // Crear una nueva transacción cuando se actualiza un producto por su ID
  async updateProductById(id: number, updateData: Partial<ProductEntity>): Promise<ProductEntity> {
    // Validar que hay al menos una transacción
    if (!updateData.transactions || updateData.transactions.length === 0) {
      throw new HttpException('At least one transaction is required', HttpStatus.BAD_REQUEST);
    }

    const transactionData = updateData.transactions[0];
    const isUpdateOperation = transactionData.operation === 'Producto Actualizado';
    const rawQuantity = Number(transactionData.quantity) || 0;
    const delta = isUpdateOperation ? Math.abs(rawQuantity) : -Math.abs(rawQuantity);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { newStock } = await this.stockService.mutateStock(queryRunner, id, delta);

      const newTransaction = this.transactionRepository.create({
        operation: transactionData.operation || 'Actualización Producto',
        quantity: rawQuantity,
        costPrice: Number(transactionData.costPrice) || 0,
        sellingPrice: Number(transactionData.sellingPrice) || 0,
        location: transactionData.location || 'Sin Datos',
        payMethod: transactionData.payMethod || 'Sin Datos',
        finalStock: newStock,
        maxDiscount: Number(transactionData.maxDiscount) || 0,
        purchaseDiscount: Number(transactionData.purchaseDiscount) || 0,
        description: transactionData.description || 'Sin Datos',
        assignedWorker: transactionData.assignedWorker || 'Sin Datos',
        createdAt: new Date(),
        product: { id } as ProductEntity,
      });

      await queryRunner.manager.save(newTransaction);

      // Apply name/image updates within the same transaction
      const partialUpdate: any = {};
      if (updateData.name) partialUpdate.name = updateData.name;
      if (updateData.image) partialUpdate.image = updateData.image;
      if (Object.keys(partialUpdate).length > 0) {
        await queryRunner.manager.update(ProductEntity, id, partialUpdate);
      }

      await queryRunner.commitTransaction();

      return (await this.productRepository.findOne({
        where: { id },
        relations: { transactions: true },
      }))!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

   // Método para hacer un soft delete de un producto
   async softDeleteProduct(id: number): Promise<ProductEntity> {
    const product = await this.productRepository.findOne({ where: { id } });

    if (!product) {
      throw new HttpException(`Product with ID ${id} not found`, HttpStatus.NOT_FOUND);
    }

    product.active = false;  // Marcar el producto como inactivo
    return await this.productRepository.save(product);
  }

   /**
    * @deprecated Use getAllProducts() or getActiveProducts() instead.
   * Product.stock is now a first-class column — no need to extract
   * finalStock from the last transaction.
   */
  async getProductsWithLastTransaction(): Promise<ProductEntity[]> {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.transactions', 'transaction')
      .leftJoinAndSelect('product.category', 'category')
      .orderBy('product.id', 'ASC') // Especifica que el ID es de la tabla `product`
      .addOrderBy('transaction.createdAt', 'DESC') // Asegura que las transacciones estén en orden descendente de fecha
      .getMany();
  
    return products.map((product) => {
      const lastTransaction = product.transactions && product.transactions.length > 0 ? product.transactions[0] : undefined; // Última transacción después de ordenar
      product.transactions = lastTransaction ? [lastTransaction] : []; // Asigna solo la última transacción
      return product;
    });
  }

   // Método para obtener las transacciones de un producto
   async getProductTransactions(productId: number): Promise<TransactionEntity[]> {
    const product = await this.productRepository.findOne({ where: { id: productId } });

    if (!product) {
      throw new HttpException(`Product with ID ${productId} not found`, HttpStatus.NOT_FOUND);
    }

    const transactions = await this.transactionRepository.find({
      where: { product: { id: productId } },  // Consulta las transacciones con el productId
      order: { createdAt: 'DESC' },            // Ordena las transacciones por fecha descendente
    });

    return transactions;
  }

  async addTransactionToProduct(
    productId: number,
    formData: any
  ): Promise<ProductEntity> {
    // Busca el producto por su ID
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: { transactions: true },
    });

    if (!product) {
      throw new HttpException(`Product with ID ${productId} not found`, HttpStatus.NOT_FOUND);
    }

    // Delta is already signed by the frontend:
    //   positive = add stock (returns, restocks)
    //   negative = remove stock (sales, refill assignments)
    const delta = Number(formData.quantity) || 0;
    let snapshotData: Record<string, any> = {};
    if (formData.snapshotData) {
      try {
        snapshotData = JSON.parse(formData.snapshotData);
      } catch {
        snapshotData = {};
      }
    }

    // Apply name/image updates within the same atomic transaction if provided
    if (formData.name) product.name = formData.name;
    if (formData.image) product.image = formData.image;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { newStock } = await this.stockService.mutateStock(queryRunner, productId, delta);

      // Create transaction with server-side computed finalStock
      const newTransaction = this.transactionRepository.create({
        operation: formData.operation || 'Actualización Producto',
        quantity: delta,
        costPrice: Number(formData.costPrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        location: formData.location || 'Sin Datos',
        payMethod: formData.payMethod || 'Sin Datos',
        finalStock: newStock,  // ← computed server-side, ignores stale client value
        maxDiscount: Number(formData.maxDiscount) || 0,
        purchaseDiscount: Number(formData.purchaseDiscount) || 0,
        description: formData.description || 'Sin Datos',
        assignedWorker: formData.assignedWorker || 'Sin Datos',
        snapshotData,
        createdAt: new Date(),
        product,
      });

      await queryRunner.manager.save(newTransaction);

      // Update product name/image within the same transaction
      await queryRunner.manager.update(ProductEntity, productId, {
        name: product.name,
        image: product.image,
      });

      await queryRunner.commitTransaction();

      // Re-fetch with relations to return updated entity
      return (await this.productRepository.findOne({
        where: { id: productId },
        relations: { transactions: true },
      }))!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}