import type { PlanDTO } from '../services/plans-service';
import type { PlanListViewModel, PlanViewModel } from '../view-models/plan-view-model';

export function mapPlanDTOToViewModel(dto: PlanDTO): PlanViewModel {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? '',
    price: dto.price,
    features: dto.features,
    subscriberCount: dto.subscriberCount ?? 0,
    isDefault: dto.isDefault ?? false,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

export function mapPlanDTOToPlanListViewModel(dto: PlanDTO): PlanListViewModel {
  const vm = mapPlanDTOToViewModel(dto);
  const channelLabels: Record<string, string> = {
    'in-app': 'In-app',
    email: 'Email',
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
  };
  return {
    ...vm,
    maxAlarmsLabel: vm.features.maxAlarms === -1 ? 'Unlimited' : String(vm.features.maxAlarms),
    channelBadges: vm.features.notificationChannels.map((ch) => ({
      label: channelLabels[ch] ?? ch,
      variant: 'default' as const,
    })),
    conditionCount: vm.features.allowedConditions.length,
  };
}
