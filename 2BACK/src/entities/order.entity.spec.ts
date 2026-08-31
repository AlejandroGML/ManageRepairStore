import { OrderEntity } from './order.entity';
import { OrderStatus } from '../order/order-status.enum';
import { RefillGroupEntity } from './refill-group.entity';
import { ClientEntity } from './client.entity';

describe('OrderEntity', () => {
  it('should create an instance with defaults', () => {
    const order = new OrderEntity();
    expect(order).toBeInstanceOf(OrderEntity);
    expect(order.status).toBe(OrderStatus.PENDIENTE);
    expect(order.comment).toBeUndefined(); // @Column({default:''}) but ? makes it undefined in-memory
  });

  it('should allow setting refillGroups relation', () => {
    const order = new OrderEntity();
    const rg1 = new RefillGroupEntity();
    rg1.id = 1;
    rg1.totalValue = 100;
    const rg2 = new RefillGroupEntity();
    rg2.id = 2;
    rg2.totalValue = 200;

    order.refillGroups = [rg1, rg2];
    expect(order.refillGroups).toHaveLength(2);
    expect(order.refillGroups[0].id).toBe(1);
    expect(order.refillGroups[1].totalValue).toBe(200);
  });

  it('should have refillGroups as undefined by default (lazy loaded)', () => {
    const order = new OrderEntity();
    expect(order.refillGroups).toBeUndefined();
  });

  it('should maintain existing properties alongside refillGroups', () => {
    const order = new OrderEntity();
    order.id = 5;
    order.description = 'Test order';
    order.status = OrderStatus.COMPLETADO;
    order.refillGroups = [new RefillGroupEntity()];

    expect(order.id).toBe(5);
    expect(order.description).toBe('Test order');
    expect(order.status).toBe(OrderStatus.COMPLETADO);
    expect(order.refillGroups).toHaveLength(1);
  });

  it('should allow client relation to coexist with refillGroups', () => {
    const order = new OrderEntity();
    order.client = { id: 10 } as ClientEntity;
    order.refillGroups = [new RefillGroupEntity()];

    expect(order.client?.id).toBe(10);
    expect(order.refillGroups).toHaveLength(1);
  });
});
