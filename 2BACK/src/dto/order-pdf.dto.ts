export interface OrderPdfDto {
  /** Client/order identification */
  clientId: number;
  code: number;
  /** Client details */
  name: string;
  rut: string;
  address: string;
  city: string;
  phone: string;
  email?: string;
  /** Order details */
  date: string;       // ISO date string or formatted date
  description: string;
  observation: string;
  status?: string;
  /** QR code as data URL (data:image/...). Optional: if omitted, the backend
   *  generates it from `code`. Kept for backward compat with old clients. */
  qr?: string;
}
