import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserEntity } from '../entities/user.entity';
import { LogService } from '../log/log.service';
import { LogEntity } from '../entities/log.entity';

@Controller('users')
@UseGuards(RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly logService: LogService,
  ) {}

  private logActivity(userName: string, action: string, clientName: string): void {
    // Fire-and-forget: un log fallido no debe romper la operación.
    this.logService
      .createLog({ userName, clientId: 0, clientName, action } as LogEntity)
      .catch((err) => console.error('Failed to write users log', err));
  }

  @Get()
  findAll(): Promise<UserEntity[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number): Promise<UserEntity> {
    return this.usersService.findById(id);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: any,
  ): Promise<UserEntity> {
    const updated = await this.usersService.update(id, updateUserDto);
    const action =
      updateUserDto.active === false
        ? 'Desactivó usuario'
        : updateUserDto.active === true
          ? 'Activó usuario'
          : 'Actualizó usuario';
    this.logActivity(req.user?.name ?? 'Sistema', action, updated?.name ?? `#${id}`);
    return updated;
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<void> {
    const target = await this.usersService.findById(id);
    await this.usersService.remove(id);
    this.logActivity(req.user?.name ?? 'Sistema', 'Eliminó usuario', target?.name ?? `#${id}`);
  }
}
