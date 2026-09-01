export interface Product {
  id?: number;
  name: string;
  image?: string | null;
  description?: string;
  maxDiscount?: number;
  quantity: number;
  stock?: number;            // Server-side stock (replaces finalStock reads)
  costPrice?: number;
  sellingPrice?: number;
  location?: string;
  transactions: Transaction[];
}


export interface Transaction {
  id: number;
  operation: string;
  createdAt?: Date;
  updatedAt?: Date;
  quantity: number;
  costPrice?: number;
  sellingPrice?: number;
  purchaseDiscount?: number;
  maxDiscount?: number;
  location?: string;
  finalStock?: number;   
  finalValue?: number;    // Agregar esta propiedad
  description?: string;      // Agregar esta propiedad
  assignedWorker?: string;   // Agregar esta propiedad
  payMethod?: string;
  product?: Product | null;  // Relación (refill history)
}

export interface RefillGroup {
  id?: number;
  createdAt?: Date;
  totalValue?: number;
  technician?: any;
  order?: any;
  operator?: any;
  transactions?: Transaction[];
}

export interface Sale {
  id?: number;
  createdAt?: Date;
  total: number;
  snapshot?: any[];
  transactions?: Transaction[];
}