import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryEntity } from '../entities/category.entity';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('Category-controller')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories with product counts' })
  async findAll(): Promise<CategoryEntity[]> {
    return this.categoryService.findAll();
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Create a category' })
  async create(@Body() dto: CreateCategoryDto): Promise<CategoryEntity> {
    return this.categoryService.create(dto.name);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Rename a category' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryEntity> {
    return this.categoryService.update(id, dto.name);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an empty category (blocked when products are assigned)' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ success: true }> {
    await this.categoryService.remove(id);
    return { success: true };
  }
}
