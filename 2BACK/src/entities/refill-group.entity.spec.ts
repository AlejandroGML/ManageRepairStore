import { RefillGroupEntity } from './refill-group.entity';

describe('RefillGroupEntity', () => {
  it('should create an instance with defaults', () => {
    const rg = new RefillGroupEntity();
    expect(rg).toBeInstanceOf(RefillGroupEntity);
    expect(rg.totalValue).toBe(0);
  });

  it('should have all properties defined', () => {
    const rg = new RefillGroupEntity();
    // Defaults
    expect(rg.totalValue).toBe(0);
    // Relations are undefined until loaded by TypeORM
    expect(rg.technician).toBeUndefined();
    expect(rg.order).toBeUndefined();
    expect(rg.operator).toBeUndefined();
    expect(rg.transactions).toBeUndefined();
    // Timestamps are DB-managed, undefined in-memory
    expect(rg.createdAt).toBeUndefined();
  });

  it('should allow totalValue to be set', () => {
    const rg = new RefillGroupEntity();
    rg.totalValue = 150.75;
    expect(rg.totalValue).toBe(150.75);
  });

  it('should allow id to be set (as returned by DB)', () => {
    const rg = new RefillGroupEntity();
    rg.id = 42;
    expect(rg.id).toBe(42);
  });
});
