import { UserProfile } from './user-profile';

describe('UserProfile interface', () => {
  it('should accept a valid UserProfile mock object', () => {
    const mock: UserProfile = {
      id: 1,
      name: 'Admin User',
      email: 'admin@demo.example',
      role: 'admin',
    };
    expect(mock.name).toBe('Admin User');
    expect(mock.role).toBe('admin');
    expect(mock.email).toBe('admin@demo.example');
  });
});
