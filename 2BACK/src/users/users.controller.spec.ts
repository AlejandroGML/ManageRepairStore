import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LogService } from '../log/log.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUsersService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: LogService,
          useValue: { createLog: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /users', () => {
    it('should return all users', async () => {
      const mockUsers = [{ id: 1, name: 'Admin', email: 'admin@demo.example', role: 'admin' }];
      mockUsersService.findAll.mockResolvedValue(mockUsers);

      const result = await controller.findAll();
      expect(result).toEqual(mockUsers);
    });
  });

  describe('GET /users/:id', () => {
    it('should return a user by id', async () => {
      const mockUser = { id: 1, name: 'Admin', email: 'admin@demo.example', role: 'admin' };
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await controller.findById(1);
      expect(result).toEqual(mockUser);
      expect(usersService.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const createDto: CreateUserDto = {
        name: 'New User',
        email: 'new@demo.example',
        password: 'password123',
        role: 'seller',
      };
      const createdUser = { id: 3, ...createDto, passwordHash: '$2a$12$hash', active: true };
      mockUsersService.create.mockResolvedValue(createdUser);

      const result = await controller.create(createDto);
      expect(result.id).toBe(3);
      expect(usersService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should update a user', async () => {
      const updateDto: UpdateUserDto = { name: 'Updated' };
      const updatedUser = { id: 1, name: 'Updated', email: 'admin@demo.example', role: 'admin' };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(1, updateDto, { user: { name: 'Admin' } } as any);
      expect(result.name).toBe('Updated');
      expect(usersService.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('should deactivate a user via active:false', async () => {
      const deactivatedUser = { id: 1, name: 'Admin', active: false };
      mockUsersService.update.mockResolvedValue(deactivatedUser);

      const result = await controller.update(1, { active: false } as UpdateUserDto, { user: { name: 'Admin' } } as any);
      expect(result.active).toBe(false);
      expect(usersService.update).toHaveBeenCalledWith(1, { active: false });
    });

    it('should reactivate a user via active:true', async () => {
      const reactivatedUser = { id: 1, name: 'Admin', active: true };
      mockUsersService.update.mockResolvedValue(reactivatedUser);

      const result = await controller.update(1, { active: true } as UpdateUserDto, { user: { name: 'Admin' } } as any);
      expect(result.active).toBe(true);
      expect(usersService.update).toHaveBeenCalledWith(1, { active: true });
    });
  });

  describe('DELETE /users/:id', () => {
    it('should definitively remove a deactivated user', async () => {
      mockUsersService.remove.mockResolvedValue(undefined);

      await expect(controller.remove(1, { user: { name: 'Admin' } } as any)).resolves.toBeUndefined();
      expect(usersService.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('@Roles decorator on controller', () => {
    it('should have RolesGuard and admin role on controller', () => {
      const roles = Reflect.getMetadata('roles', UsersController);
      expect(roles).toEqual(['admin']);
    });
  });
});
