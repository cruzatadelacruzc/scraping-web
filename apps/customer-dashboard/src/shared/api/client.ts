import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
  withCredentials: true,
});

// Request interceptor: attach access token
apiClient.interceptors.request.use((config) => {
  const session = JSON.parse(localStorage.getItem('auth-session') || '{}');
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

// Response interceptor: handle 401
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        // Will call auth service to refresh
        const response = await apiClient.post('/api/auth/refresh');
        const { accessToken } = response.data;
        const session = JSON.parse(localStorage.getItem('auth-session') || '{}');
        session.accessToken = accessToken;
        localStorage.setItem('auth-session', JSON.stringify(session));
        refreshSubscribers.forEach((cb) => cb(accessToken));
        refreshSubscribers = [];
        original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch {
        localStorage.removeItem('auth-session');
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);