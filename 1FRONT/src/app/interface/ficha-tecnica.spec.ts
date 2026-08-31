import { OrdenIngreso } from './ficha-tecnica';

describe('OrdenIngreso interface', () => {
  it('should accept a valid OrdenIngreso mock object', () => {
    const mock: OrdenIngreso = {
      name: 'Test Order',
      rut: '12345678-5',
      address: 'Address 123',
      city: 'Santiago',
      phone: '+56912345678',
      description: 'Test description',
      observation: 'Test observation',
    };
    expect(mock.name).toBe('Test Order');
    expect(mock.rut).toBe('12345678-5');
    expect(mock.description).toBe('Test description');
    expect(mock.address).toBe('Address 123');
  });
});
