import type { AccountDTO } from '../services/types';
import type { AccountViewModel } from '../view-models/account-view-model';
import { AccountStatus } from '../view-models/account-view-model';

export function mapAccountDTOToViewModel(dto: AccountDTO): AccountViewModel {
  const status = mapStatus(dto.status);
  return {
    id: dto.id,
    name: dto.name,
    status,
    ownerEmail: dto.ownerEmail,
    userCount: dto.userCount,
    planName: dto.planName,
    createdAt: new Date(dto.createdAt),
    statusBadge: getStatusBadge(status),
  };
}

function mapStatus(raw: string): AccountStatus {
  if (raw === AccountStatus.Suspended) return AccountStatus.Suspended;
  if (raw === AccountStatus.Deleted) return AccountStatus.Deleted;
  return AccountStatus.Active;
}

function getStatusBadge(status: AccountStatus): AccountViewModel['statusBadge'] {
  switch (status) {
    case AccountStatus.Active:
      return { label: 'Active', variant: 'success' };
    case AccountStatus.Suspended:
      return { label: 'Suspended', variant: 'warning' };
    case AccountStatus.Deleted:
      return { label: 'Deleted', variant: 'danger' };
  }
}
