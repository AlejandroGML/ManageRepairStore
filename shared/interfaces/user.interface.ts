export interface SystemUser {
  id?: number;
  name: string;
  email: string;
  role: 'admin' | 'seller' | 'warehouse';
  active: boolean;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'seller' | 'warehouse';
}
