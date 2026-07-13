import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_BASE = 'http://localhost:3000/api';

const apiClient = axios.create({ baseURL: API_BASE });

interface AuthHandlers {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  onRefreshSuccess: (tokens: { accessToken: string; refreshToken: string }) => void;
  onRefreshFail: () => void;
}

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/**
 * Configures the axios instance with auth interceptors.
 * Must be called once at app bootstrap (before any API calls).
 */
export function configureAuthHandlers(handlers: AuthHandlers): void {
  // Request interceptor: attach access token
  apiClient.interceptors.request.use((config) => {
    const token = handlers.getAccessToken();
    if (token) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });

  // Response interceptor: handle 401 → refresh → retry
  apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as RetryableRequest | undefined;
      if (!originalRequest) {
        return Promise.reject(new Error('Request configuration missing'));
      }

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        const refreshToken = handlers.getRefreshToken();
        if (!refreshToken) {
          handlers.onRefreshFail();
          return Promise.reject(new Error('No refresh token available'));
        }

        try {
          const res = await axios.post<{ token: string; refreshToken: string }>(
            `${API_BASE}/auth/refresh`,
            { refreshToken },
          );
          handlers.onRefreshSuccess({
            accessToken: res.data.token,
            refreshToken: res.data.refreshToken,
          });
          originalRequest.headers.Authorization = `Bearer ${res.data.token}`;
          return await apiClient(originalRequest);
        } catch {
          handlers.onRefreshFail();
          return Promise.reject(new Error('Session expired'));
        }
      }
      return Promise.reject(error);
    },
  );
}

/** Axios instance with auth interceptors wired. */
export { apiClient };
