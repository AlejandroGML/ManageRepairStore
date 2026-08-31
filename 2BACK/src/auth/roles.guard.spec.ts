import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { ROLES_KEY } from './roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const mockContext = (user: any, handlerRoles?: string[]) => {
    const handler = () => {};
    if (handlerRoles) {
      Reflect.defineMetadata(ROLES_KEY, handlerRoles, handler);
    }
    return {
      getHandler: () => handler,
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as any;
  };

  it('should allow access when user role matches required role', () => {
    const context = mockContext({ role: 'admin' }, ['admin']);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user role does not match required role', () => {
    const context = mockContext({ role: 'seller' }, ['admin']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow access when no roles are required', () => {
    const context = mockContext({ role: 'seller' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when there is no user in request', () => {
    const context = mockContext(null, ['admin']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should use ForbiddenException with Spanish message', () => {
    const context = mockContext({ role: 'seller' }, ['admin']);
    try {
      guard.canActivate(context);
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
      expect(e.message).toBe('Acceso denegado');
    }
  });
});
