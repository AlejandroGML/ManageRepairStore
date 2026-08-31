import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should bypass authentication when @Public() is set on handler', () => {
    const handler = () => {};
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);

    const context = {
      getHandler: () => handler,
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
    } as any;

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should bypass authentication when @Public() is set on class', () => {
    // @Public() on a class stores metadata on the constructor function
    const cls = class {};
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, cls);

    const context = {
      getHandler: () => () => {},
      getClass: () => cls,
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
    } as any;

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });
});
