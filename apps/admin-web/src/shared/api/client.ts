import { ENV } from '@shared/config/env';
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const apiClient = axios.create({ baseURL: ENV.API_BASE_URL });

interface AuthHandlers {
  /** Current access token, or `null` when unauthenticated. */
  getAccessToken: () => string | null;
  /**
   * Performs a single-flight token refresh. Resolves once storage holds a
   * fresh access token; rejects when the session cannot be recovered.
   * Backed by `SessionManager.refresh()` so every refresh path is deduplicated.
   */
  refresh: () => Promise<void>;
  /** Invoked when the session is unrecoverable (redirect to login). */
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

  // Response interceptor: unwrap backend envelope { status, message, data } → data
  apiClient.interceptors.response.use((response) => {
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  });

  // Response interceptor: handle 401 → refresh → retry
  apiClient.interceptors.response.use(undefined, async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequest | undefined;
    if (!originalRequest) {
      return Promise.reject(new Error('Request configuration missing'));
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await handlers.refresh();
      } catch {
        handlers.onRefreshFail();
        return Promise.reject(new Error('Session expired'));
      }

      const token = handlers.getAccessToken();
      if (!token) {
        handlers.onRefreshFail();
        return Promise.reject(new Error('Session expired'));
      }

      originalRequest.headers.Authorization = `Bearer ${token}`;
      return await apiClient(originalRequest);
    }
    return Promise.reject(error);
  });
}

/** Axios instance with auth interceptors wired. */
export { apiClient };
