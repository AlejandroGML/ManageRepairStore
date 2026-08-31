import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: Repository<UserEntity>;

  const mockUser: UserEntity = {
    id: 1,
    name: 'Admin',
    email: 'admin@demo.example',
    passwordHash: '$2a$12$hashed',
    role: 'admin',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPayload = {
    sub: 1,
    email: 'admin@demo.example',
    role: 'admin',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userRepository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate and return user when payload sub matches existing active user', async () => {
    jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
    const result = await strategy.validate(mockPayload);
    expect(result).toEqual(mockUser);
    expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('should throw UnauthorizedException when user not found', async () => {
    jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
    await expect(strategy.validate(mockPayload)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when user is not active', async () => {
    const inactiveUser = { ...mockUser, active: false };
    jest.spyOn(userRepository, 'findOne').mockResolvedValue(inactiveUser);
    await expect(strategy.validate(mockPayload)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException with Spanish message for inactive user', async () => {
    const inactiveUser = { ...mockUser, active: false };
    jest.spyOn(userRepository, 'findOne').mockResolvedValue(inactiveUser);
    try {
      await strategy.validate(mockPayload);
    } catch (e) {
      expect(e.message).toBe('Cuenta desactivada');
    }
  });
});
