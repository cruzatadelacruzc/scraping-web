import { apiClient } from '@shared/api/client';

export interface RoleDTO {
  id: string;
  name: string;
  _count?: { users: number };
}

export interface RoleListResponse {
  roles: RoleDTO[];
  total: number;
}

export const rolesService = {
  list(params?: { signal?: AbortSignal }) {
    return apiClient.get<RoleListResponse>('/admin/roles', { params });
  },

  create(data: { name: string }) {
    return apiClient.post<RoleDTO>('/admin/roles', data);
  },

  delete(id: string) {
    return apiClient.delete(`/admin/roles/${id}`);
  },
};
