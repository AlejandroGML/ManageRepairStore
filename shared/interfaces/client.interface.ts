export interface Client {
  id?: number;
  name: string;
  rut_raw: string;
  rut_normalizado?: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  active?: boolean;
  group_id?: number;
  company_name?: string;
}
