import { apiClient } from '@shared/api/client';

export interface PlanFeaturesDTO {
  maxAlarms: number;
  allowedConditions: string[];
  aiAlarms: boolean;
  notificationChannels: string[];
}

export interface PlanDTO {
  id: string;
  name: string;
  description: string;
  price: number;
  features: PlanFeaturesDTO;
  isDefault: boolean;
  subscriberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanListResponseDTO {
  plans: PlanDTO[];
  total: number;
}

export interface PlanSubscriberDTO {
  accountId: string;
  accountName: string;
  userCount: number;
  status: string;
  periodStart: string;
  periodEnd: string;
}

export const plansService = {
  list(params: { skip: number; limit: number; search?: string; signal?: AbortSignal }) {
    const { signal, ...queryParams } = params;
    return apiClient.get<PlanListResponseDTO>('/plans', { params: queryParams, signal });
  },
  getById(id: string) {
    return apiClient.get<PlanDTO>(`/plans/${id}`);
  },
  create(data: { name: string; description: string; price: number; features: PlanFeaturesDTO }) {
    return apiClient.post<PlanDTO>('/plans', data);
  },
  update(
    id: string,
    data: { name: string; description: string; price: number; features: PlanFeaturesDTO },
  ) {
    return apiClient.put<PlanDTO>(`/plans/${id}`, data);
  },
  delete(id: string) {
    return apiClient.delete(`/plans/${id}`);
  },
  getSubscribers(id: string) {
    return apiClient.get<PlanSubscriberDTO[]>(`/plans/${id}/subscribers`);
  },
};
