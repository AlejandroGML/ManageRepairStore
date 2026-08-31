import { ClientGroupEntity } from './client-group.entity';

describe('ClientGroupEntity', () => {
  it('should create an instance with defaults', () => {
    const group = new ClientGroupEntity();
    expect(group).toBeInstanceOf(ClientGroupEntity);
    expect(group.active).toBe(true);
  });

  it('should have all properties defined after setting required fields', () => {
    const group = new ClientGroupEntity();
    group.rut_normalizado = '76543210-5';
    group.name = 'Test Group';
    expect(group.rut_normalizado).toBe('76543210-5');
    expect(group.name).toBe('Test Group');
    // Undefined before being set
    expect(group.payment_terms).toBe('');
    // Timestamps are DB-managed, undefined in-memory
    expect(group.created_at).toBeUndefined();
    expect(group.updated_at).toBeUndefined();
  });

  it('should allow active to be toggled', () => {
    const group = new ClientGroupEntity();
    expect(group.active).toBe(true);
    group.active = false;
    expect(group.active).toBe(false);
  });

  it('should allow credit_limit to be set', () => {
    const group = new ClientGroupEntity();
    group.credit_limit = 5000000;
    expect(group.credit_limit).toBe(5000000);
  });

  it('should allow payment_terms to be set', () => {
    const group = new ClientGroupEntity();
    group.payment_terms = '30 días';
    expect(group.payment_terms).toBe('30 días');
  });
});
