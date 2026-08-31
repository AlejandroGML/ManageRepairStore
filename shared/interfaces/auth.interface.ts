import { SystemUser } from './user.interface';

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: SystemUser;
}
