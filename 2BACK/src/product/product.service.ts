import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProductEntity } from '../entities/product.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { CategoryEntity } from '../entities/category.entity';
import { StockService } from './stock.service';
import * as ExcelJS from 'exceljs';
import { normalize } from '../client/duplicate-matcher';

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
  /**
   * Nombres se comparan normalizados (sin tildes/puntuación, espacios
   * colapsados): evita duplicados tipo "válvula X" vs "valvula x".
   */
  private async assertNoNormalizedNameConflict(name: string, excludeId?: number): Promise<void> {
    const normalized = normalize(name);
    if (!normalized) return;
    const all = await this.productRepository.find({
      where: { active: true },
      select: { id: true, name: true },
    });
    const conflict = all.find(
      (p) => p.id !== excludeId && normalize(p.name) === normalized,
    );
    if (conflict) {
      throw new HttpException(
        `Ya existe un producto similar: "${conflict.name}" (#${conflict.id})`,
        HttpStatus.CONFLICT,
      );
    }
  }

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

    await this.assertNoNormalizedNameConflict(product.name);

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

      return await this.productRepository.save(product);
    }
}

   // Traer todos los productos con active en true
   /**
   * Búsqueda server-side para el formulario de reposiciones (cliente
   * Raspberry Pi): ILIKE por campo elegido, sin volcar el catálogo.
   */
  async searchProducts(
    q: string,
    field: string,
    limit = 20,
    offset = 0,
    category = 'all',
    stock: 'all' | 'stock' | 'low' = 'all',
  ): Promise<{ items: ProductEntity[]; total: number }> {
    const capped = Math.min(Math.max(limit, 1), 50);
    const qb = this.productRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .where('p.active = :active', { active: true });
    if (q) {
      const term = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      switch (field) {
        case 'id':
          qb.andWhere('CAST(p.id AS TEXT) ILIKE :term', { term });
          break;
        case 'location':
          qb.andWhere('p.location ILIKE :term', { term });
          break;
        case 'category':
          qb.andWhere('category.name ILIKE :term', { term });
          break;
        default:
          qb.andWhere('p.name ILIKE :term', { term });
      }
    }
    if (category && category !== 'all') {
      qb.andWhere('category.name = :categoryName', { categoryName: category });
    }
    if (stock === 'stock') {
      qb.andWhere('p.stock > 0');
    } else if (stock === 'low') {
      // Umbral fijo del negocio: crítico ≤2 · bajo 3-6 → "stock bajo" = < 7.
      qb.andWhere('p.stock < 7');
    }
    const total = await qb.getCount();
    const items = await qb
      .orderBy('p.id', 'DESC')
      .skip(Math.max(offset, 0))
      .take(capped)
      .getMany();
    return { items, total };
  }

  /** Total de productos activos (encabezado del catálogo). */
  /**
   * Export XLSX de productos con stock bajo (umbral fijo: < 7).
   * Ordenado por stock ascendente: los más críticos primero.
   */
  async buildLowStockXlsx(): Promise<ExcelJS.Buffer> {
    const products = await this.productRepository.find({
      where: { active: true },
      order: { stock: 'ASC' },
    });
    const low = products.filter((p) => (p.stock ?? 0) < 7);

    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Stock bajo');
    const headers = ['Producto', 'Stock', 'Mínimo'] as const;
    const headerRow = sheet.addRow([...headers]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D28D9' } };
      cell.alignment = { vertical: 'middle' };
    });

    low.forEach((p, i) => {
      const row = sheet.addRow([p.name, p.stock ?? 0, p.minimum ?? 0]);
      if (i % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        });
      }
    });

    const widths = headers.map((_, col) => {
      let max = headers[col].length;
      for (const p of low) {
        const v = String([p.name, p.stock ?? 0, p.minimum ?? 0][col] ?? '');
        if (v.length > max) max = v.length;
      }
      return Math.min(max + 3, 45);
    });
    sheet.columns.forEach((col, i) => (col.width = widths[i]));
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };

    return wb.xlsx.writeBuffer();
  }

  async countActive(): Promise<number> {
    return this.productRepository.count({ where: { active: true } });
  }

  async getActiveProducts(): Promise<ProductEntity[]> {
    return await this.productRepository.find({
      where: { active: true },
      order: {id: 'DESC',}, // Orden descendente por ID
      relations: { transactions: true, category: true },
    });
  }

  // Traer todos los productos, sin importar el valor de active
  async getAllProducts(): Promise<ProductEntity[]> {
    return await this.productRepository.find({
      relations: { transactions: true, category: true },
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
    if (updateData.name) {
      await this.assertNoNormalizedNameConflict(updateData.name, id);
    }
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

      // Apply name/image/attribute updates within the same transaction
      const partialUpdate: any = {};
      if (updateData.name) partialUpdate.name = updateData.name;
      if (updateData.image) partialUpdate.image = updateData.image;
      if (transactionData.costPrice !== undefined) partialUpdate.costPrice = Number(transactionData.costPrice) || 0;
      if (transactionData.sellingPrice !== undefined) partialUpdate.sellingPrice = Number(transactionData.sellingPrice) || 0;
      if (transactionData.maxDiscount !== undefined) partialUpdate.maxDiscount = Number(transactionData.maxDiscount) || 0;
      if (transactionData.location !== undefined) partialUpdate.location = transactionData.location || '';
      if (transactionData.description !== undefined) partialUpdate.description = transactionData.description || '';
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

    // Apply name/image updates within the same atomic transaction if provided
    if (formData.name) product.name = formData.name;
    if (formData.image) product.image = formData.image;
    // Apply product-level fields (reorder threshold, category) if provided
    if (formData.minimum !== undefined && formData.minimum !== '') {
      product.minimum = Number(formData.minimum);
    }
    if (formData.categoryId && Number(formData.categoryId) > 0) {
      product.category = { id: Number(formData.categoryId) } as CategoryEntity;
    }

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
        createdAt: new Date(),
        product,
      });

      await queryRunner.manager.save(newTransaction);

      // Update product name/image/minimum/category within the same transaction
      await queryRunner.manager.update(ProductEntity, productId, {
        name: product.name,
        image: product.image,
        minimum: product.minimum,
        category: product.category ?? undefined,
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