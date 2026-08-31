import { UserEntity } from './user.entity';

describe('UserEntity', () => {
  it('should create an instance with defaults', () => {
    const user = new UserEntity();
    expect(user).toBeInstanceOf(UserEntity);
    expect(user.name).toBe('');
    expect(user.role).toBe('seller');
    expect(user.active).toBe(true);
  });

  it('should have all auth-related properties defined', () => {
    const user = new UserEntity();
    // Properties with in-class defaults are available after instantiation
    expect(user.name).toBe('');
    expect(user.role).toBe('seller');
    expect(user.active).toBe(true);
    // Nullable properties start undefined
    expect(user.email).toBeUndefined();
    expect(user.passwordHash).toBeUndefined();
    // Timestamps are DB-managed, undefined in-memory
    expect(user.createdAt).toBeUndefined();
    expect(user.updatedAt).toBeUndefined();
  });

  it('should accept valid role values', () => {
    const admin = new UserEntity();
    admin.role = 'admin';
    expect(admin.role).toBe('admin');

    const seller = new UserEntity();
    seller.role = 'seller';
    expect(seller.role).toBe('seller');

    const warehouse = new UserEntity();
    warehouse.role = 'warehouse';
    expect(warehouse.role).toBe('warehouse');
  });

  it('should allow email to be set', () => {
    const user = new UserEntity();
    user.email = 'admin@demo.example';
    expect(user.email).toBe('admin@demo.example');
  });

  it('should allow passwordHash to be set', () => {
    const user = new UserEntity();
    user.passwordHash = '$2a$12$hashedvalue';
    expect(user.passwordHash).toBe('$2a$12$hashedvalue');
  });

  it('should allow active to be toggled', () => {
    const user = new UserEntity();
    expect(user.active).toBe(true);
    user.active = false;
    expect(user.active).toBe(false);
  });
});
