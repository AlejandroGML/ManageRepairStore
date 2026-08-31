import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  it('should accept valid email and password (min 8 chars)', async () => {
    const dto = new LoginDto();
    dto.email = 'admin@demo.example';
    dto.password = 'password123';
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject missing email', async () => {
    const dto = new LoginDto();
    dto.email = '';
    dto.password = 'password123';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.property === 'email')).toBe(true);
  });

  it('should reject invalid email format', async () => {
    const dto = new LoginDto();
    dto.email = 'not-an-email';
    dto.password = 'password123';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.property === 'email')).toBe(true);
  });

  it('should reject password shorter than 8 characters', async () => {
    const dto = new LoginDto();
    dto.email = 'admin@demo.example';
    dto.password = '1234567';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.property === 'password')).toBe(true);
  });

  it('should reject empty password', async () => {
    const dto = new LoginDto();
    dto.email = 'admin@demo.example';
    dto.password = '';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.property === 'password')).toBe(true);
  });
});
