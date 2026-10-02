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
  /** Empresa (sucursales comparten rut). NULL = particular. */
  company_id?: number | null;
  /** Empresa resuelta (para mostrar nombre/rut sin copias). */
  company?: { id?: number; name: string; rut_normalizado?: string } | null;
}
