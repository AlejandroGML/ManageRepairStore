import { Test, TestingModule } from '@nestjs/testing';
import { OrderMapperService } from './order.mapper.service';
import { OrderFront } from '../dto/order.front.dto';
import { OrderStatusFront } from '../dto/order.status.front.dto';
import { OrderStatus } from './order-status.enum';

describe('OrderMapperService', () => {
  let service: OrderMapperService;

  const makeOrderFront = (overrides: Partial<OrderFront> = {}): OrderFront => ({
    name: 'Comercial Demo SpA',
    rut: '12.345.678-5',
    address: 'Providencia 123',
    city: 'Santiago',
    phone: '+56 9 1234 5678',
    email: 'test@demo.example',
    description: 'fix leak',
    observation: 'urgent',
    status: OrderStatus.PENDIENTE,
    comment: 'call first',
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderMapperService],
    }).compile();

    service = module.get<OrderMapperService>(OrderMapperService);
  });

  describe('mapToClientEntity', () => {
    it('should lowercase/trim name, address and city, and strip dots/hyphens from rut', () => {
      const entity = service.mapToClientEntity(makeOrderFront({
        name: '  Comercial Demo SpA  ',
        rut: '12.345.678-5',
        address: '  Providencia 123 ',
        city: 'SANTIAGO',
      }));

      expect(entity.name).toBe('comercial demo spa');
      expect(entity.rut_raw).toBe('123456785');
      expect(entity.address).toBe('providencia 123');
      expect(entity.city).toBe('santiago');
    });

    it('should map clientId to id and pass through phone, email and company_name', () => {
      const entity = service.mapToClientEntity(makeOrderFront({
        clientId: 42,
        company_name: 'Sucursal Norte',
      }));

      expect(entity.id).toBe(42);
      expect(entity.phone).toBe('+56 9 1234 5678');
      expect(entity.email).toBe('test@demo.example');
      expect(entity.company_name).toBe('Sucursal Norte');
    });

    it('should compute rut_normalizado via normalizeRut when not provided', () => {
      const entity = service.mapToClientEntity(makeOrderFront({ rut_normalizado: undefined }));

      expect(entity.rut_normalizado).toBe('12345678-5');
    });

    it('should preserve rut_normalizado when the frontend already provides it', () => {
      const entity = service.mapToClientEntity(makeOrderFront({ rut_normalizado: '99999999-9' }));

      expect(entity.rut_normalizado).toBe('99999999-9');
    });

    it('should leave rut_normalizado undefined when the RUT cannot be normalized', () => {
      const entity = service.mapToClientEntity(makeOrderFront({
        rut: '00.000.000-0',
        rut_normalizado: undefined,
      }));

      expect(entity.rut_normalizado).toBeUndefined();
    });

    it('should build the nested order with today date and default PENDIENTE status', () => {
      const entity = service.mapToClientEntity(makeOrderFront({ status: undefined }));

      expect(entity.orders).toHaveLength(1);
      expect(entity.orders![0].description).toBe('fix leak');
      expect(entity.orders![0].observation).toBe('urgent');
      expect(entity.orders![0].comment).toBe('call first');
      expect(entity.orders![0].date).toBeInstanceOf(Date);
      expect(entity.orders![0].status).toBe(OrderStatus.PENDIENTE);
    });
  });

  describe('mapToOrderEntity', () => {
    it('should copy description, observation, date, status and comment', () => {
      const date = new Date('2026-08-17T12:00:00Z');
      const entity = service.mapToOrderEntity(makeOrderFront({
        status: OrderStatus.EN_REPARACION,
        date,
      }));

      expect(entity.description).toBe('fix leak');
      expect(entity.observation).toBe('urgent');
      expect(entity.date).toBe(date);
      expect(entity.status).toBe(OrderStatus.EN_REPARACION);
      expect(entity.comment).toBe('call first');
    });

    it('should cast the status string to OrderStatus enum value', () => {
      const entity = service.mapToOrderEntity(makeOrderFront({ status: 'Completado' }));

      expect(entity.status).toBe(OrderStatus.COMPLETADO);
    });
  });

  describe('mapToOrderStatusEntity', () => {
    it('should copy id, status and comment', () => {
      const input: OrderStatusFront = { id: 7, status: 'Entregado', comment: 'done' };

      const entity = service.mapToOrderStatusEntity(input);

      expect(entity.id).toBe(7);
      expect(entity.status).toBe(OrderStatus.ENTREGADO);
      expect(entity.comment).toBe('done');
    });

    it('should cast the status string to OrderStatus enum value', () => {
      const input: OrderStatusFront = { id: 7, status: 'Cancelado', comment: '' };

      const entity = service.mapToOrderStatusEntity(input);

      expect(entity.status).toBe(OrderStatus.CANCELADO);
    });
  });
});
