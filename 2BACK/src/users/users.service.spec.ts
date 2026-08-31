import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from '../entities/user.entity';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<UserEntity>;

  const mockUsers: UserEntity[] = [
    {
      id: 1, name: 'Admin', email: 'admin@demo.example',
      passwordHash: '$2a$12$hash1', role: 'admin', active: true,
      createdAt: new Date(), updatedAt: new Date(),
    },
    {
      id: 2, name: 'Seller', email: 'seller@demo.example',
      passwordHash: '$2a$12$hash2', role: 'seller', active: true,
      createdAt: new Date(), updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
  });

  describe('findAll', () => {
    it('should return all users ordered by createdAt DESC', async () => {
      jest.spyOn(userRepository, 'find').mockResolvedValue(mockUsers);
      const result = await service.findAll();
      expect(result).toEqual(mockUsers);
      expect(userRepository.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
    });

    it('should return empty array when no users exist', async () => {
      jest.spyOn(userRepository, 'find').mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUsers[0]);
      const result = await service.findById(1);
      expect(result).toEqual(mockUsers[0]);
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto: CreateUserDto = {
      name: 'New User',
      email: 'new@demo.example',
      password: 'password123',
      role: 'seller',
    };

    it('should create user with hashed password', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2a$12$hashednew' as never);
      jest.spyOn(userRepository, 'create').mockReturnValue({
        name: 'New User',
        email: 'new@demo.example',
        passwordHash: '$2a$12$hashednew',
        role: 'seller',
        active: true,
      } as UserEntity);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        id: 3,
        name: 'New User',
        email: 'new@demo.example',
        passwordHash: '$2a$12$hashednew',
        role: 'seller',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createDto);
      expect(result.email).toBe('new@demo.example');
      expect(result.passwordHash).toBe('$2a$12$hashednew');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });

    it('should throw ConflictException when email already exists', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUsers[0]);
      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUsers[0]);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...mockUsers[0],
        name: 'Updated Admin',
      });

      const updateDto: UpdateUserDto = { name: 'Updated Admin' };
      const result = await service.update(1, updateDto);
      expect(result.name).toBe('Updated Admin');
    });

    it('should hash password when updating password', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUsers[0]);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2a$12$newhashed' as never);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...mockUsers[0],
        passwordHash: '$2a$12$newhashed',
      });

      const updateDto: UpdateUserDto = { password: 'newpass123' };
      const result = await service.update(1, updateDto);
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 12);
      expect(result.passwordHash).toBe('$2a$12$newhashed');
    });

    it('should throw ConflictException when new email already exists', async () => {
      jest.spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockUsers[0])  // findById finds user 1
        .mockResolvedValueOnce(mockUsers[1]);  // email check finds user 2

      const updateDto: UpdateUserDto = { email: 'seller@demo.example' };
      await expect(service.update(1, updateDto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when user to update not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      const updateDto: UpdateUserDto = { name: 'Nope' };
      await expect(service.update(999, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should set active to false', async () => {
      const activeUser = { ...mockUsers[0], active: true };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(activeUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...activeUser,
        active: false,
      });

      const result = await service.deactivate(1);
      expect(result.active).toBe(false);
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      await expect(service.deactivate(999)).rejects.toThrow(NotFoundException);
    });
  });
});
