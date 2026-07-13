export interface AccountViewModel {
  id: string;
  name: string;
  status: AccountStatus;
  ownerEmail: string;
  userCount: number;
  planName: string;
  createdAt: Date;
}

export enum AccountStatus {
  Active = 'active',
  Suspended = 'suspended',
  Deleted = 'deleted',
}
