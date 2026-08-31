import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    validateUser: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should return JWT and user profile on valid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'admin@demo.example',
        password: 'password123',
      };

      const mockUser = {
        id: 1,
        name: 'Admin',
        email: 'admin@demo.example',
        role: 'admin',
      };

      mockAuthService.validateUser.mockResolvedValue(mockUser);
      mockAuthService.login.mockResolvedValue({
        access_token: 'jwt-token-123',
        user: {
          id: 1,
          email: 'admin@demo.example',
          role: 'admin',
          name: 'Admin',
        },
      });

      const result = await controller.login(loginDto);
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('admin@demo.example');
      expect(authService.validateUser).toHaveBeenCalledWith(
        'admin@demo.example',
        'password123',
      );
    });

    it('should call authService.login with the validated user', async () => {
      const loginDto: LoginDto = {
        email: 'admin@demo.example',
        password: 'password123',
      };

      const mockUser = { id: 1, name: 'Admin', email: 'admin@demo.example', role: 'admin' };
      mockAuthService.validateUser.mockResolvedValue(mockUser);
      mockAuthService.login.mockResolvedValue({ access_token: 'token', user: mockUser });

      await controller.login(loginDto);
      expect(authService.login).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('GET /auth/me', () => {
    it('should return user profile from request', () => {
      const mockRequest = {
        user: {
          id: 1,
          email: 'admin@demo.example',
          role: 'admin',
          name: 'Admin',
          passwordHash: '$2a$12$...',
        },
      };

      const result = controller.getProfile(mockRequest);
      expect(result).toEqual({
        id: 1,
        email: 'admin@demo.example',
        role: 'admin',
        name: 'Admin',
      });
      // Should NOT expose passwordHash
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should return user profile even without passwordHash', () => {
      const mockRequest = {
        user: {
          id: 2,
          email: 'seller@demo.example',
          role: 'seller',
          name: 'Seller',
        },
      };

      const result = controller.getProfile(mockRequest);
      expect(result.id).toBe(2);
      expect(result.name).toBe('Seller');
    });
  });
});
