import { Injectable } from '@nestjs/common';
import { OrderFront } from '../dto/order.front.dto';
import { OrderStatusFront } from '../dto/order.status.front.dto';
import { ClientEntity } from '../entities/client.entity';
import { OrderEntity } from '../entities/order.entity';
import { normalizeRut } from '../services/rut.service';
import { OrderStatus } from './order-status.enum';

@Injectable()
export class OrderMapperService {
  mapToClientEntity(order: OrderFront): ClientEntity {
    return {
      id: order.clientId,
      name: order.name?.toLowerCase().trim() || '',
      rut_raw: order.rut?.toLowerCase().trim().replace(/[.-]/g, '') || '', // Quitar puntos y guion al rut
      address: order.address?.toLowerCase().trim() || '',
      city: order.city?.toLowerCase().trim() || '',
      phone: order.phone,
      email: order.email,
      orders: [{
        description: order.description || '',
        observation: order.observation || '',
        date: new Date(),
        status: order.status || OrderStatus.PENDIENTE,
        comment: order.comment
      }],
      rut_normalizado: order.rut_normalizado ?? normalizeRut(order.rut) ?? undefined,
      company_name: order.company_name,
    } as ClientEntity;
  }

  mapToOrderEntity(order:OrderFront):OrderEntity{
    const entity :OrderEntity = {
      description:order.description,
      observation:order.observation,
      date:order.date,
      status: order.status as OrderStatus,
      comment:order.comment,
      total: order.total ?? 0,
    }
    return entity;
  }

  mapToOrderStatusEntity(order:OrderStatusFront):OrderEntity{
    const entity :OrderEntity = {
      id:order.id,
      status: order.status as OrderStatus,
      comment:order.comment,
      total: 0,
    }
    return entity;
  }
}
