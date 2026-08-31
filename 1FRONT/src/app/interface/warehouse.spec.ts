import { Product, Transaction } from './warehouse';

describe('Product interface', () => {
  it('should accept a valid Product mock object', () => {
    const mock: Product = {
      name: 'Test Product',
      quantity: 100,
      transactions: [],
    };
    expect(mock.name).toBe('Test Product');
    expect(mock.quantity).toBe(100);
    expect(mock.transactions).toEqual([]);
  });
});

describe('Transaction interface', () => {
  it('should accept a valid Transaction mock object', () => {
    const mock: Transaction = {
      id: 1,
      operation: 'IN',
      quantity: 50,
    };
    expect(mock.operation).toBe('IN');
    expect(mock.quantity).toBe(50);
  });
});
