import { SystemUser as SharedSystemUser } from '@shared/interfaces';

export { SharedSystemUser };
export interface SystemUser extends SharedSystemUser {
  id: number;
  createdAt: string;
  updatedAt: string;
}
