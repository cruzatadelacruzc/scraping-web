export interface AccountViewModel {
  id: string;
  name: string;
  status: AccountStatus;
  ownerEmail: string;
  userCount: number;
  planName: string;
  createdAt: Date;
  statusBadge: {
    label: string;
    variant: 'success' | 'danger' | 'warning';
  };
}

export enum AccountStatus {
  Active = 'active',
  Suspended = 'suspended',
  Deleted = 'deleted',
}
