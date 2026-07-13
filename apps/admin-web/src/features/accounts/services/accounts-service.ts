import { apiClient } from '@shared/api/client';

export interface AccountDTO {
  id: string;
  name: string;
  status: string;
  ownerEmail: string;
  userCount: number;
  planName: string;
  createdAt: string;
}

export interface AccountListResponse {
  accounts: AccountDTO[];
  total: number;
}

export const accountsService = {
  list(params: { page: number; limit: number; search?: string; signal?: AbortSignal }) {
    return apiClient.get<AccountListResponse>('/admin/accounts', { params });
  },
  getById(id: string) {
    return apiClient.get<AccountDTO>(`/admin/accounts/${id}`);
  },
  delete(id: string) {
    return apiClient.delete(`/admin/accounts/${id}`);
  },
};
