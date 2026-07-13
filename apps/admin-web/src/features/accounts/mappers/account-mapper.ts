import type { AccountDTO } from '../services/accounts-service';
import type { AccountViewModel } from '../view-models/account-view-model';

export function mapAccountDTOToViewModel(dto: AccountDTO): AccountViewModel {
  return {
    id: dto.id,
    name: dto.name,
    status: dto.status,
    ownerEmail: dto.ownerEmail,
    userCount: dto.userCount,
    planName: dto.planName,
    createdAt: new Date(dto.createdAt),
  };
}
