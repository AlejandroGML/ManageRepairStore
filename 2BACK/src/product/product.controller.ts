import { Controller, Get, Param, Post, Body, UsePipes, ValidationPipe, UseInterceptors, Patch, Delete, UploadedFile, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { RefillService } from './refill.service';
import { ProductEntity } from '../entities/product.entity';
import { extname } from 'path';
import { TransactionEntity } from '../entities/transaction.entity';
import { RefillGroupEntity } from '../entities/refill-group.entity';

@ApiTags('Product-controller')
@Controller('product')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly refillService: RefillService,
  ) {}

  // Endpoint para crear un nuevo producto, manejando carga de imagen
  @Post()
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads', // Directorio donde se guardará la imagen
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`); // Nombra el archivo de forma única
      },
    }),
  }))
  @UsePipes(new ValidationPipe())
  @ApiResponse({ status: 201, description: 'Creates a new product with an image.' })
  @ApiOperation({ summary: 'Create a new product with an image' })
  async createProduct(
    @UploadedFile() file: Express.Multer.File, // El archivo subido
    @Body() product: ProductEntity,
  ): Promise<ProductEntity> {
    // Guardar la ruta de la imagen en la base de datos si se sube un archivo
    if (file) {
      product.image = `/uploads/${file.filename}`;
    }
    
    // Guardar el producto y devolver la respuesta
    return this.productService.registerProduct(product);
  }


  // Endpoint para obtener un producto por ID
  @Get('/by-id/:id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Return a product by ID' })
  async getProductById(@Param('id') id: number): Promise<ProductEntity> {
    return this.productService.getProductById(id);
  }

  // Endpoint para obtener productos por nombre
  @Get('/by-name')
  @ApiOperation({ summary: 'Get products by name' })
  @ApiResponse({ status: 200, description: 'Return products by name' })
  async getProductsByName(@Query('name') name: string): Promise<ProductEntity[]> {
    return this.productService.getProductsByName(name);
  }

  // Endpoint para obtener productos por ubicación
  @Get('/by-location')
  @ApiOperation({ summary: 'Get products by location' })
  @ApiResponse({ status: 200, description: 'Return products by location' })
  async getProductsByLocation(@Query('location') location: string): Promise<ProductEntity[]> {
    return this.productService.getProductsByLocation(location);
  }

   // Endpoint para crear una nueva transacción al actualizar un producto
  @Patch('/update/:id')
  @ApiOperation({ summary: 'Update product by ID with new transaction' })
  @ApiResponse({ status: 200, description: 'Update a product by ID with new transaction' })
  async updateProductById(
    @Param('id') id: number,
    @Body() updateData: Partial<ProductEntity>
  ): Promise<ProductEntity> {
    return this.productService.updateProductById(id, updateData);
  }


 // Endpoint para obtener un producto con su ultima transaccion 
  /**
   * @deprecated Use GET /product/all or /product/active instead.
   * Product.stock is now a first-class column on the entity.
   */
  @Get('/lastTransaction')
  async getProductsWithLastTransaction(): Promise<ProductEntity[]> {
    return this.productService.getProductsWithLastTransaction();
  }

   // Endpoint para obtener todos los productos con active en true
  @Get('/active')
  @ApiOperation({ summary: 'Get all active products' })
  @ApiResponse({ status: 200, description: 'Return all active products' })
  async getActiveProducts(): Promise<ProductEntity[]> {
    return this.productService.getActiveProducts();
  }

  // Endpoint para obtener todos los productos, sin importar el estado de active
  @Get('/all')
  @ApiOperation({ summary: 'Get all products (active and inactive)' })
  @ApiResponse({ status: 200, description: 'Return all products' })
  async getAllProducts(): Promise<ProductEntity[]> {
    return this.productService.getAllProducts();
  }

  // Endpoint para hacer un soft delete de un producto
  @Delete('/delete/:id')
  @ApiOperation({ summary: 'Soft delete a product by ID' })
  @ApiResponse({ status: 200, description: 'Product marked as inactive' })
  async softDeleteProduct(@Param('id') id: number): Promise<ProductEntity> {
    return this.productService.softDeleteProduct(id);
  }

     // Nuevo endpoint para obtener transacciones de un producto específico
  @Get(':productId/transactions')
  @ApiOperation({ summary: 'Get transactions for a specific product' })
  @ApiResponse({ status: 200, description: 'Returns transactions for the product' })
  async getProductTransactions(@Param('productId') productId: number): Promise<TransactionEntity[]> {
    return await this.productService.getProductTransactions(productId);
  }

 // Nuevo endpoint para agregar una transacción de actualización
 @Post('/:id/transaction')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
      },
    }),
  }))
  
  async createProductTransaction(
    @Param('id') id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() formData: any  // Procesa todos los datos como un único objeto FormData
  ): Promise<ProductEntity> {
    // Si existe una imagen, establece la ruta en formData
    if (file) {
      formData.image = `/uploads/${file.filename}`;
    }
    return this.productService.addTransactionToProduct(id, formData);
  }

// Nuevo endpoint para verificar el nombre de un producto ya existente
@Get('/exists')
async checkProductNameExists(@Query('name') name: string): Promise<boolean> {
  const product = await this.productService.getProductsByName(name);
  return product.length > 0;
}

// Endpoint for atomic batch refill operations
@Post('/refills/batch')
@ApiOperation({ summary: 'Create atomic batch refill with RefillGroup' })
@ApiResponse({ status: 201, description: 'RefillGroup created with transactions' })
async createRefillBatch(@Body() body: {
  products: Array<{
    productId: number;
    quantity: number;
    operation: string;
    description?: string;
    sellingPrice?: number;
    costPrice?: number;
  }>;
  technicianId?: number;
  orderId?: number;
  totalValue?: number;
  snapshotData?: Record<string, any>;
}): Promise<RefillGroupEntity> {
  return this.refillService.createRefillBatch(body);
}

}
