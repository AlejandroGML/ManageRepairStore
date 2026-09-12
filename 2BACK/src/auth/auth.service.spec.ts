import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from '../entities/user.entity';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<UserEntity>;
  let jwtService: JwtService;

  const mockUser: UserEntity = {
    id: 1,
    name: 'Admin',
    email: 'admin@demo.example',
    passwordHash: '$2a$12$hashedpassword123',
    role: 'admin',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.validateUser('admin@demo.example', 'password123');
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'admin@demo.example' },
      });
    });

    it('should throw UnauthorizedException when user not found by email', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.validateUser('unknown@demo.example', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.validateUser('admin@demo.example', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const inactiveUser = { ...mockUser, active: false };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(inactiveUser);

      await expect(
        service.validateUser('admin@demo.example', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return Spanish error message for invalid credentials', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      try {
        await service.validateUser('admin@demo.example', 'wrong');
      } catch (e) {
        expect(e.message).toBe('Credenciales inválidas');
      }
    });

    it('should return Spanish error message for inactive account', async () => {
      const inactiveUser = { ...mockUser, active: false };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(inactiveUser);

      try {
        await service.validateUser('admin@demo.example', 'password123');
      } catch (e) {
        expect(e.message).toBe('Cuenta desactivada');
      }
    });
  });

  describe('login', () => {
    it('should return access token and user profile', async () => {
      const result = await service.login(mockUser);

      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user).toEqual({
        id: 1,
        email: 'admin@demo.example',
        role: 'admin',
        name: 'Admin',
        active: true,
      });
    });

    it('should sign JWT with correct payload', async () => {
      const signSpy = jest.spyOn(jwtService, 'sign');
      await service.login(mockUser);

      expect(signSpy).toHaveBeenCalledWith({
        sub: 1,
        email: 'admin@demo.example',
        role: 'admin',
      });
    });
  });

  describe('changePassword', () => {
    it('should hash and store the new password when the current one matches', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue({ ...mockUser });
      // 1ª llamada: current válida (true); 2ª: new distinta de la actual (false)
      jest.spyOn(bcrypt, 'compare')
        .mockResolvedValueOnce(true as never)
        .mockResolvedValueOnce(false as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2a$12$newhash' as never);
      const saveSpy = jest.spyOn(userRepository, 'save').mockResolvedValue({} as any);

      await service.changePassword(1, 'Password2026!', 'NuevaClave123');

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: '$2a$12$newhash' }),
      );
    });

    it('should throw Unauthorized when user does not exist', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.changePassword(999, 'whatever', 'NuevaClave123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequest when the current password is wrong', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue({ ...mockUser });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.changePassword(1, 'wrong', 'NuevaClave123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequest when the new password equals the current one', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue({ ...mockUser });
      jest
        .spyOn(bcrypt, 'compare')
        .mockResolvedValue(true as never);

      await expect(
        service.changePassword(1, 'same', 'same'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
