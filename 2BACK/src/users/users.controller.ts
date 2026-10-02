import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserEntity } from '../entities/user.entity';
import { LogService } from '../log/log.service';
import { LogEntity } from '../entities/log.entity';

/** User shape safe to serialize: never carries the password hash. */
export type PublicUser = Omit<UserEntity, 'passwordHash'>;

@Controller('users')
@UseGuards(RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly logService: LogService,
  ) {}

  /**
   * Strip `passwordHash` before anything leaves the API. The service layer
   * keeps working with the full entity; only the HTTP boundary is shaped.
   */
  private toPublic(user: UserEntity): PublicUser {
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
  }

  private logActivity(userName: string, action: string, clientName: string): void {
    // Fire-and-forget: un log fallido no debe romper la operación.
    this.logService
      .createLog({ userName, clientId: 0, clientName, action } as LogEntity)
      .catch((err) => console.error('Failed to write users log', err));
  }

  @Get()
  async findAll(): Promise<PublicUser[]> {
    const users = await this.usersService.findAll();
    return users.map((u) => this.toPublic(u));
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<PublicUser> {
    return this.toPublic(await this.usersService.findById(id));
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<PublicUser> {
    return this.toPublic(await this.usersService.create(createUserDto));
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: any,
  ): Promise<PublicUser> {
    const updated = await this.usersService.update(id, updateUserDto);
    const action =
      updateUserDto.active === false
        ? 'Desactivó usuario'
        : updateUserDto.active === true
          ? 'Activó usuario'
          : 'Actualizó usuario';
    this.logActivity(req.user?.name ?? 'Sistema', action, updated?.name ?? `#${id}`);
    return this.toPublic(updated);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<void> {
    const target = await this.usersService.findById(id);
    await this.usersService.remove(id);
    this.logActivity(req.user?.name ?? 'Sistema', 'Eliminó usuario', target?.name ?? `#${id}`);
  }
}
