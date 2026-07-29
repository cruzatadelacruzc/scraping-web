export interface PlanFeaturesViewModel {
  maxAlarms: number;
  allowedConditions: string[];
  aiAlarms: boolean;
  notificationChannels: string[];
}

export interface PlanViewModel {
  id: string;
  name: string;
  description: string;
  price: number;
  features: PlanFeaturesViewModel;
  subscriberCount: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanListViewModel extends PlanViewModel {
  maxAlarmsLabel: string;
  channelBadges: { label: string; variant: 'default' | 'primary' }[];
  conditionCount: number;
}
