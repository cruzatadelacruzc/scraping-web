import { apiClient } from '@shared/api/client';

export interface AccountDTO {
  id: string;
  name: string;
  userCount: number;
  subscriptionCount: number;
  alarmCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccountListResponse {
  accounts: AccountDTO[];
  total: number;
  skip: number;
  limit: number;
}

export const accountsService = {
  list(params: { skip: number; limit: number; search?: string; signal?: AbortSignal }) {
    return apiClient.get<AccountListResponse>('/admin/accounts', { params });
  },
  getById(id: string) {
    return apiClient.get<AccountDTO>(`/admin/accounts/${id}`);
  },
  delete(id: string) {
    return apiClient.delete(`/admin/accounts/${id}`);
  },
};
