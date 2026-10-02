import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CompanyEntity } from '../entities/company.entity';
import { ClientEntity } from '../entities/client.entity';
import { CompanyService, CompanyListResult } from './company.service';

@ApiTags('Company-controller')
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @ApiResponse({ status: 200, description: 'Empresas paginadas con conteo de sucursales.' })
  @ApiOperation({ summary: 'List companies (paginated, name/rut search)' })
  async list(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('q') q = '',
  ): Promise<CompanyListResult> {
    return this.companyService.list(Number(page) || 1, Number(limit) || 10, q);
  }

  @Get(':id/clients')
  @ApiResponse({ status: 200, description: 'Sucursales activas de la empresa.' })
  @ApiOperation({ summary: 'Get the branch clients of a company' })
  async getClients(@Param('id') id: number): Promise<ClientEntity[]> {
    return this.companyService.getClients(Number(id));
  }

  @Patch(':id')
  @ApiResponse({ status: 200, description: 'Empresa renombrada.' })
  @ApiResponse({ status: 409, description: 'Nombre duplicado entre empresas activas.' })
  @ApiOperation({ summary: 'Rename a company' })
  async rename(
    @Param('id') id: number,
    @Body() body: { name?: string },
  ): Promise<CompanyEntity> {
    return this.companyService.rename(Number(id), body?.name ?? '');
  }
}
