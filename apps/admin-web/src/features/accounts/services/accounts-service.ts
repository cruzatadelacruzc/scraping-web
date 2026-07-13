import { apiClient } from '@shared/api/client';
import type { AccountDTO, AccountListResponseDTO } from './types';

export const accountsService = {
  list(params: { page: number; limit: number }) {
    return apiClient.get<AccountListResponseDTO>('/admin/accounts', { params });
  },

  getById(id: string) {
    return apiClient.get<AccountDTO>(`/admin/accounts/${id}`);
  },

  delete(id: string) {
    return apiClient.delete(`/admin/accounts/${id}`);
  },
};
