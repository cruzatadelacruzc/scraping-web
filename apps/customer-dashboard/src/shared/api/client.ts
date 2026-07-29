import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '';

/** The single axios instance for the app. Auth is wired via configureAuthHandlers. */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  withCredentials: true,
});

interface AuthHandlers {
  getAccessToken: () => string | null;
  /** Performs a token refresh; resolves to the new access token or null. */
  refresh: () => Promise<string | null>;
  onAuthFailure: () => void;
}

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let authHandlers: AuthHandlers | null = null;

/** Wires auth into the client. Called once at bootstrap by shared/auth/runtime. */
export function configureAuthHandlers(handlers: AuthHandlers): void {
  authHandlers = handlers;
}

// Request: attach the in-memory bearer token.
apiClient.interceptors.request.use((config) => {
  const token = authHandlers?.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response (success): unwrap the backend envelope { status, message, data } → data.
apiClient.interceptors.response.use((response) => {
  const body = response.data;
  if (body && typeof body === 'object' && 'status' in body && 'data' in body) {
    response.data = (body as { data: unknown }).data;
  }
  return response;
});

// Response (error): on 401, refresh once and replay the original request.
apiClient.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as RetryableRequest | undefined;
  if (!original || error.response?.status !== 401 || original._retry || !authHandlers) {
    return Promise.reject(error);
  }
  // Never try to refresh the refresh call itself → avoids infinite recursion.
  if (original.url?.includes('/auth/refresh')) {
    authHandlers.onAuthFailure();
    return Promise.reject(error);
  }
  original._retry = true;
  try {
    const newToken = await authHandlers.refresh();
    if (!newToken) {
      authHandlers.onAuthFailure();
      return Promise.reject(error);
    }
    if (original.headers) {
      original.headers.Authorization = `Bearer ${newToken}`;
    }
    return await apiClient(original);
  } catch {
    authHandlers.onAuthFailure();
    return Promise.reject(error);
  }
});
