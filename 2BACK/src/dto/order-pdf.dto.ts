export interface OrderPdfDto {
  /** Client/order identification */
  clientId: number;
  /**
   * Order code. Numeric id for legacy orders, ORD-xxxx string for new ones.
   * The QR payload and PDF layout MUST NOT change with the new format.
   */
  code: string | number;
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
