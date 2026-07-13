import type { AccountDTO } from '../services/accounts-service';
import type { AccountViewModel } from '../view-models/account-view-model';

export function mapAccountDTOToViewModel(dto: AccountDTO): AccountViewModel {
  return {
    id: dto.id,
    name: dto.name,
    userCount: dto.userCount,
    subscriptionCount: dto.subscriptionCount,
    alarmCount: dto.alarmCount,
    createdAt: new Date(dto.createdAt),
  };
}
