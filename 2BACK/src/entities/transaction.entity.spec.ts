import { TransactionEntity } from './transaction.entity';
import { RefillGroupEntity } from './refill-group.entity';
import { ProductEntity } from './product.entity';
import { UserEntity } from './user.entity';

describe('TransactionEntity', () => {
  it('should create an instance with defaults', () => {
    const tx = new TransactionEntity();
    expect(tx).toBeInstanceOf(TransactionEntity);
    expect(tx.operation).toBe('');
    expect(tx.deleted).toBe(false);
    expect(tx.location).toBe('');
    expect(tx.payMethod).toBe('');
  });

  it('should allow setting refillGroup relation', () => {
    const tx = new TransactionEntity();
    const rg = new RefillGroupEntity();
    rg.id = 1;
    rg.totalValue = 100;

    tx.refillGroup = rg;
    expect(tx.refillGroup).toBe(rg);
    expect(tx.refillGroup.id).toBe(1);
    expect(tx.refillGroup.totalValue).toBe(100);
  });

  it('should have refillGroup as nullable (undefined by default)', () => {
    const tx = new TransactionEntity();
    expect(tx.refillGroup).toBeUndefined();
  });

  it('should allow setting refillGroup to null for unlink', () => {
    const tx = new TransactionEntity();
    tx.refillGroup = undefined;
    expect(tx.refillGroup).toBeUndefined();
  });

  it('should maintain existing relations alongside refillGroup', () => {
    const tx = new TransactionEntity();
    tx.refillGroup = new RefillGroupEntity();
    tx.product = { id: 1, name: 'test', stock: 10 } as ProductEntity;
    tx.operator = { id: 2, name: 'operator' } as UserEntity;

    expect(tx.refillGroup).toBeDefined();
    expect(tx.product?.id).toBe(1);
    expect(tx.operator?.name).toBe('operator');
  });
});
