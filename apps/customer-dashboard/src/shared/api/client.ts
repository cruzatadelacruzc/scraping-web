import axios from 'axios';
import { tokenStorage } from '@/features/auth/services/token-storage';
import { authApi } from '@/features/auth/services/auth-api';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token && !tokenStorage.isExpired()) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const newTokens = await authApi.refreshToken();
        tokenStorage.setTokens({
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresIn: newTokens.expiresIn,
        });
        error.config.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        return apiClient.request(error.config);
      } catch {
        tokenStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);