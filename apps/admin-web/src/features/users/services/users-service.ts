import { apiClient } from '@shared/api/client';

export interface UserDTO {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  roles: Array<{ id: string; name: string }>;
  emailVerified: boolean;
  createdAt: string;
}

export interface UserListResponse {
  users: UserDTO[];
  total: number;
}

export const usersService = {
  list(params: { skip: number; limit: number; signal?: AbortSignal }) {
    return apiClient.get<UserListResponse>('/admin/users', { params });
  },
  delete(id: string) {
    return apiClient.delete(`/admin/users/${id}`);
  },
};
