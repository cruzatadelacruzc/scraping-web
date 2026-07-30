import { apiClient } from '@shared/api/client';

export interface UserDTO {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  roles: { id: string; name: string }[];
  emailVerified: boolean;
  createdAt: string;
}

export interface UserListResponse {
  users: UserDTO[];
  total: number;
}

export interface RoleDTO {
  id: string;
  name: string;
  accountId: string | null;
  deletedAt: string | null;
  userCount?: number;
}

export interface RoleListResponse {
  roles: RoleDTO[];
}

export const usersService = {
  list(params: { skip: number; limit: number; search?: string; signal?: AbortSignal }) {
    const queryParams: Record<string, string | number> = { skip: params.skip, limit: params.limit };
    if (params.search) {
      queryParams.search = params.search;
    }
    return apiClient.get<UserListResponse>('/users', { params: queryParams });
  },

  getById(id: string) {
    return apiClient.get<UserDTO>(`/users/${id}`);
  },

  delete(id: string) {
    return apiClient.delete(`/users/${id}`);
  },

  getRoles() {
    return apiClient.get<RoleListResponse>('/admin/roles');
  },

  toggleRole(roleId: string) {
    return apiClient.patch<{ role: RoleDTO }>(`/admin/roles/${roleId}/toggle`);
  },

  assignRole(userId: string, roleId: string) {
    return apiClient.post(`/admin/users/${userId}/roles/${roleId}`);
  },

  removeRole(userId: string, roleId: string) {
    return apiClient.delete(`/admin/users/${userId}/roles/${roleId}`);
  },
};
