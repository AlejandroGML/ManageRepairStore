import { validate } from 'class-validator';
import { UpdateUserDto } from './update-user.dto';

describe('UpdateUserDto', () => {
  it('should accept empty dto (all fields optional)', async () => {
    const dto = new UpdateUserDto();
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept partial update with name only', async () => {
    const dto = new UpdateUserDto();
    dto.name = 'Updated Name';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept update with all fields', async () => {
    const dto = new UpdateUserDto();
    dto.name = 'Updated User';
    dto.email = 'updated@demo.example';
    dto.password = 'newpassword123';
    dto.role = 'admin';
    dto.active = true;

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject password shorter than 8 characters', async () => {
    const dto = new UpdateUserDto();
    dto.password = 'short';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.property === 'password')).toBe(true);
  });

  it('should reject invalid role', async () => {
    const dto = new UpdateUserDto();
    (dto as any).role = 'superadmin';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.property === 'role')).toBe(true);
  });
});
