import { ROLES_KEY, Roles } from './roles.decorator';

describe('@Roles decorator', () => {
  it('should set roles metadata with single role', () => {
    class TestController {
      @Roles('admin')
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.testMethod);
    expect(metadata).toEqual(['admin']);
  });

  it('should set roles metadata with multiple roles', () => {
    class TestController {
      @Roles('admin', 'seller')
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.testMethod);
    expect(metadata).toEqual(['admin', 'seller']);
  });
});
