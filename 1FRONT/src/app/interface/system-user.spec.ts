import { SystemUser } from './system-user';

describe('SystemUser interface', () => {
  it('should accept a valid SystemUser mock object', () => {
    const mock: SystemUser = {
      name: 'System Admin',
      email: 'admin@demo.example',
      role: 'admin',
      active: true,
      id: 1,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };
    expect(mock.name).toBe('System Admin');
    expect(mock.role).toBe('admin');
    expect(mock.active).toBe(true);
    expect(mock.createdAt).toBe('2025-01-01T00:00:00Z');
  });
});
