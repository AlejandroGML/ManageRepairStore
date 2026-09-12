import { Controller, Get, Param, Post, Body, UsePipes, ValidationPipe, Patch, Delete, Query, Res } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { ClientEntity } from '../entities/client.entity';
import { ClientService, CompanyInfo } from './client.service';
import { ClientExample } from '../utils/controllers.examples';
import { DuplicateCheckDto } from './dto/duplicate-check.dto';
import { DuplicateMatch } from './duplicate-matcher';


@ApiTags('Client-controller')
@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get('/data')
  @ApiResponse({ status: 200, description: 'Returns all users.'})
  @ApiOperation({ summary: 'Get all client' })
  async getAllUsers(): Promise<ClientEntity[]> {
    return this.clientService.getAllUsers();
  }

  @Get('/companies')
  @ApiResponse({ status: 200, description: 'Empresas inscritas (autocomplete).'})
  @ApiOperation({ summary: 'Get registered companies with representative RUT' })
  async getCompanies(): Promise<CompanyInfo[]> {
    return this.clientService.getCompanies();
  }

  @Post('/duplicates-check')
  @ApiResponse({ status: 200, description: 'Coincidencias potenciales de clientes.'})
  @ApiOperation({ summary: 'Check client duplicates by name/rut/phone/email/address/company' })
  async checkDuplicates(@Body() dto: DuplicateCheckDto): Promise<{ count: number; matches: DuplicateMatch[] }> {
    return this.clientService.checkDuplicates(dto);
  }

  @Get('/count')
  @ApiResponse({ status: 200, description: 'Get quantity of clients.'})
  @ApiOperation({ summary: 'Get quantity of clients' })
  async getCountUsers(): Promise<number> {
    return this.clientService.getCountUsers();
  }

  @Get('/by-rut/:rut')
  @ApiResponse({ status: 200, description: 'Return clients with the given RUT.'})
  @ApiOperation({ summary: 'Get clients by RUT' })
  async findByRut(@Param('rut') rut: string): Promise<ClientEntity[]> {
    return this.clientService.getClientsByRut(rut);
  }

  @Get('/by-name/:name')
  @ApiResponse({ status: 200, description: 'Return clients with the given Name.'})
  @ApiOperation({ summary: 'Get clients by Name' })
  async findByName(@Param('name') name: string): Promise<ClientEntity[]> {
    return this.clientService.getUsersByName(name.trim().toLowerCase());
  }

  @Get('/by-address/:address')
  @ApiResponse({ status: 200, description: 'Return clients with the given Address.'})
  @ApiOperation({ summary: 'Get clients by Address' })
  async findByAddress(@Param('address') address: string): Promise<ClientEntity[]> {
    return this.clientService.getUsersByAddress(address.trim().toLowerCase());
  }

  @Get('/search')
  @ApiResponse({ status: 200, description: 'Server-side client search (finder).' })
  @ApiOperation({ summary: 'Search clients by field with partial match' })
  async searchClients(
    @Query('q') q: string = '',
    @Query('field') field: string = 'name',
    @Query('limit') limit: string = '100',
  ): Promise<{ items: Array<ClientEntity & { orderCount: number }>; total: number }> {
    return this.clientService.searchClients(q.trim(), field, Number(limit) || 100);
  }

  @Get('/export')
  @ApiOperation({ summary: 'Export all clients as a styled XLSX (finder export button)' })
  async exportClients(@Res() res: Response): Promise<void> {
    const buffer = await this.clientService.buildClientsXlsx();
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="clientes-${date}.xlsx"`);
    res.send(Buffer.from(buffer as ArrayBuffer));
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Returns the user with the specified ID.'})
  @ApiResponse({ status: 204, description: 'User not found.' })
  @ApiOperation({ summary: 'Get a client by ID' })
  async getUserById(@Param('id') id: number): Promise<ClientEntity | null> {
    return this.clientService.getUserById(id);
  }

  @Post()
  @UsePipes(new ValidationPipe())
  @ApiResponse({ status: 201, description: 'Creates a new Client.'})
  @ApiBody({ type: ClientEntity, examples: ClientExample })
  @ApiOperation({ summary: 'Create a new Client.' })
  async createUser(@Body() user: ClientEntity): Promise<ClientEntity> {
    return await  this.clientService.createUser(user);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe())
  @ApiResponse({ status: 200, description: 'Update a Client.'})
  @ApiBody({ type: ClientEntity, examples: ClientExample })
  @ApiOperation({ summary: 'Update a Client.' })
  async updateUser(@Param('id') id: number,@Body() user: ClientEntity): Promise<ClientEntity> {
    return await  this.clientService.updateUserById(id,user);
  }

  @Delete(':id')
  @ApiResponse({ status: 200, description: 'Delete a Client.'})
  @ApiOperation({ summary: 'Delete a Client.' })
  async deleteUser(@Param('id') id: number): Promise<void> {
    return await  this.clientService.deleteUserById(id);
  }
}
