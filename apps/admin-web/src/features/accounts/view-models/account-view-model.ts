export interface AccountViewModel {
  id: string;
  name: string;
  userCount: number;
  subscriptionCount: number;
  alarmCount: number;
  createdAt: Date;
  planName?: string;
  subscriptionStatus?: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
}
