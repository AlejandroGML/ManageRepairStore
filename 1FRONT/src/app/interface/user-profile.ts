import { SystemUser } from '@shared/interfaces';
export { SystemUser };

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
}
