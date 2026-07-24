import axios from 'axios';
import { ENDPOINTS } from '@shared/api/endpoints';
import type { AuthCredentials, RegisterData, ForgotPasswordData, ResetPasswordData, VerifyEmailData, LoginResponse, RegisterResponse, RefreshTokenResponse, AuthTokens } from '../types/auth-types';

const authApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
  withCredentials: true,
});

export const authApi = {
  async login(credentials: AuthCredentials): Promise<LoginResponse> {
    const response = await authApiClient.post<LoginResponse>(ENDPOINTS.AUTH.LOGIN, credentials);
    return response.data;
  },

  async register(data: RegisterData): Promise<RegisterResponse> {
    const response = await authApiClient.post<RegisterResponse>(ENDPOINTS.AUTH.REGISTER_LOCAL, data);
    return response.data;
  },

  async forgotPassword(data: ForgotPasswordData): Promise<{ message: string }> {
    const response = await authApiClient.post<{ message: string }>(ENDPOINTS.AUTH.FORGOT_PASSWORD, data);
    return response.data;
  },

  async resetPassword(data: ResetPasswordData): Promise<{ message: string }> {
    const response = await authApiClient.post<{ message: string }>(ENDPOINTS.AUTH.RESET_PASSWORD, data);
    return response.data;
  },

  async verifyEmail(data: VerifyEmailData): Promise<{ message: string }> {
    const response = await authApiClient.post<{ message: string }>(ENDPOINTS.AUTH.VERIFY_EMAIL, data);
    return response.data;
  },

  async refreshToken(): Promise<RefreshTokenResponse> {
    const response = await authApiClient.post<RefreshTokenResponse>(ENDPOINTS.AUTH.REFRESH);
    return response.data;
  },

  async logout(): Promise<{ message: string }> {
    const response = await authApiClient.post<{ message: string }>(ENDPOINTS.AUTH.LOGOUT);
    return response.data;
  },
};

export function mapTokensToStorage(tokens: RefreshTokenResponse): AuthTokens {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
  };
}