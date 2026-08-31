import { Client, Order, Log } from './client';

describe('Client interface', () => {
  it('should accept a valid Client mock object', () => {
    const mock: Client = {
      name: 'Test Client',
      rut_raw: '12345678-5',
      address: 'Address 123',
      city: 'Santiago',
      code: 1001,
      phone: '+56912345678',
    };
    expect(mock.name).toBe('Test Client');
    expect(mock.rut_raw).toBe('12345678-5');
    expect(mock.code).toBe(1001);
    expect(mock.address).toBe('Address 123');
  });

  it('should accept an Order mock object', () => {
    const mock: Order = {
      description: 'Test order',
      observation: 'Test observation',
      date: new Date('2025-01-01'),
      id: 1,
    };
    expect(mock.description).toBe('Test order');
    expect(mock.id).toBe(1);
  });

  it('should accept a Log mock object', () => {
    const mock: Log = {
      userName: 'admin',
      clientId: 1,
      clientName: 'Test Client',
      action: 'CREATE',
    };
    expect(mock.userName).toBe('admin');
    expect(mock.action).toBe('CREATE');
  });
});
