import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/auth-api';
import { tokenStorage, mapTokensToStorage } from '../services/token-storage';
import type { AuthCredentials, RegisterData, ForgotPasswordData, ResetPasswordData, VerifyEmailData, User } from '../types/auth-types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: AuthCredentials) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
  forgotPassword: (data: ForgotPasswordData) => Promise<void>;
  resetPassword: (data: ResetPasswordData) => Promise<void>;
  verifyEmail: (data: VerifyEmailData) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (tokenStorage.hasValidToken()) {
        try {
          await refreshSession();
        } catch {
          tokenStorage.clear();
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const refreshSession = async () => {
    const tokens = await authApi.refreshToken();
    tokenStorage.setTokens(mapTokensToStorage(tokens));
    // TODO: Add endpoint to get current user
  };

  const login = async (credentials: AuthCredentials) => {
    const response = await authApi.login(credentials);
    tokenStorage.setTokens({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresIn,
    });
    setUser(response.user);
    return response.user;
  };

  const register = async (data: RegisterData) => {
    const response = await authApi.register(data);
    tokenStorage.setTokens({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresIn,
    });
    setUser(response.user);
    return response.user;
  };

  const logout = async () => {
    await authApi.logout();
    tokenStorage.clear();
    setUser(null);
  };

  const forgotPassword = async (data: ForgotPasswordData) => {
    await authApi.forgotPassword(data);
  };

  const resetPassword = async (data: ResetPasswordData) => {
    await authApi.resetPassword(data);
  };

  const verifyEmail = async (data: VerifyEmailData) => {
    await authApi.verifyEmail(data);
    await refreshSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        verifyEmail,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}