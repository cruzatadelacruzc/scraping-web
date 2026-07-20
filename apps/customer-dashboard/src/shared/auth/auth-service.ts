import axios from 'axios';
import type { AuthSession } from './types';

export class AuthService {
  async login(username: string, password: string): Promise<AuthSession> {
    const response = await axios.post('/api/auth/login', { username, password });
    return response.data;
  }

  async register(data: {
    accountId: string;
    email: string;
    username: string;
    password: string;
    roleIds?: string[];
  }): Promise<AuthSession> {
    const response = await axios.post('/api/accounts/register/local', data);
    return response.data;
  }

  async refresh(): Promise<AuthSession> {
    const response = await axios.post('/api/auth/refresh');
    return response.data;
  }

  async logout(): Promise<void> {
    await axios.post('/api/auth/logout');
  }

  async forgotPassword(email: string): Promise<void> {
    await axios.post('/api/auth/forgot-password', { email });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await axios.post('/api/auth/reset-password', { token, password });
  }

  async verifyEmail(token: string): Promise<void> {
    await axios.post('/api/auth/verify-email', { token });
  }

  async resendVerification(): Promise<void> {
    await axios.post('/api/auth/send-verification-email');
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await axios.post('/api/auth/password', { currentPassword, newPassword });
  }

  async changeEmail(email: string): Promise<void> {
    await axios.post('/api/auth/email', { email });
  }

  async linkProvider(provider: string, accountId: string): Promise<void> {
    await axios.post('/api/auth/link-provider', { provider, accountId });
  }

  async unlinkProvider(provider: string): Promise<void> {
    await axios.post(`/api/auth/link-provider/${provider}`);
  }
}