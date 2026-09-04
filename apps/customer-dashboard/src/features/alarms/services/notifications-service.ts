import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { NotificationDTO } from '../types';

export const notificationsService = {
  async list(signal?: AbortSignal): Promise<NotificationDTO[]> {
    const res = await apiClient.get<{ notifications: NotificationDTO[] }>(
      ENDPOINTS.NOTIFICATIONS.LIST,
      { signal }
    );
    return res.data.notifications;
  },
};
