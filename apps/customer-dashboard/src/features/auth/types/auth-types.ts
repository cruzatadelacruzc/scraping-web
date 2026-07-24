type Brand<K, T> = T & { __brand: K };

export type Email = Brand<'Email', string>;
export type Password = Brand<'Password', string>;
export type Token = Brand<'Token', string>;
export type UserId = Brand<'UserId', string>;

export interface AuthCredentials {
  email: Email;
  password: Password;
}

export interface AuthTokens {
  accessToken: Token;
  refreshToken: Token;
  expiresIn: number;
}

export interface User {
  id: UserId;
  email: Email;
  name: string;
  avatar?: string;
  role: 'ACCOUNT_OWNER' | 'MEMBER';
  verified: boolean;
}

export interface RegisterData {
  name: string;
  email: Email;
  password: Password;
}

export interface ForgotPasswordData {
  email: Email;
}

export interface ResetPasswordData {
  token: Token;
  password: Password;
}

export interface VerifyEmailData {
  token: Token;
}

export interface LoginResponse {
  user: User;
  accessToken: Token;
  refreshToken: Token;
  expiresIn: number;
}

export interface RegisterResponse {
  user: User;
  accessToken: Token;
  refreshToken: Token;
  expiresIn: number;
}

export interface RefreshTokenResponse {
  accessToken: Token;
  refreshToken: Token;
  expiresIn: number;
}