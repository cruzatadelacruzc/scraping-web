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
  _count: { users: number };
}

export interface RoleListResponse {
  roles: RoleDTO[];
  total: number;
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

  assignRole(userId: string, roleId: string) {
    return apiClient.post(`/users/${userId}/roles/${roleId}`);
  },

  removeRole(userId: string, roleId: string) {
    return apiClient.delete(`/users/${userId}/roles/${roleId}`);
  },
};
