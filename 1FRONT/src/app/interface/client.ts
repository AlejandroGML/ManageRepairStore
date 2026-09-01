import { Client as SharedClient } from '@shared/interfaces';

export { SharedClient };
export interface Client extends SharedClient {
  parent_client_id?: number;
  code?: number;
  phone: string;
  orders?: Order[];
}

export interface Order {
  description: string;
  observation: string;
  date: Date;
  id: number;
  status?: string;
  comment?: string;
  total?: number;
}

export interface Log {
  userName: string;
  clientId: number;
  clientName: string;
  action: string;
  date?: Date;
}
