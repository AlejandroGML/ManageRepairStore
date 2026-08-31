import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto', () => {
  it('should accept valid user data', async () => {
    const dto = new CreateUserDto();
    dto.name = 'New User';
    dto.email = 'newuser@demo.example';
    dto.password = 'password123';
    dto.role = 'seller';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject missing name', async () => {
    const dto = new CreateUserDto();
    dto.email = 'newuser@demo.example';
    dto.password = 'password123';
    dto.role = 'seller';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.property === 'name')).toBe(true);
  });

  it('should reject invalid email', async () => {
    const dto = new CreateUserDto();
    dto.name = 'New User';
    dto.email = 'not-an-email';
    dto.password = 'password123';
    dto.role = 'seller';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.property === 'email')).toBe(true);
  });

  it('should reject password shorter than 8 characters', async () => {
    const dto = new CreateUserDto();
    dto.name = 'New User';
    dto.email = 'newuser@demo.example';
    dto.password = 'short';
    dto.role = 'seller';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.property === 'password')).toBe(true);
  });

  it('should reject invalid role', async () => {
    const dto = new CreateUserDto();
    dto.name = 'New User';
    dto.email = 'newuser@demo.example';
    dto.password = 'password123';
    (dto as any).role = 'superadmin';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.property === 'role')).toBe(true);
  });

  it('should accept admin role', async () => {
    const dto = new CreateUserDto();
    dto.name = 'Admin User';
    dto.email = 'admin2@demo.example';
    dto.password = 'password123';
    dto.role = 'admin';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept warehouse role', async () => {
    const dto = new CreateUserDto();
    dto.name = 'Bodega User';
    dto.email = 'bodega@demo.example';
    dto.password = 'password123';
    dto.role = 'warehouse';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
