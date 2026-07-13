/** Role types matching the backend enum. */
export enum RoleType {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ACCOUNT_OWNER = 'ACCOUNT_OWNER',
  MEMBER = 'MEMBER',
}

/** Session state exposed by AuthProvider. */
export interface AuthSession {
  userId: string;
  accountId: string;
  username: string;
  email: string;
  roles: RoleType[];
  expiresAt: number; // Unix timestamp ms
}

/** Credentials for local login. */
export interface LoginCredentials {
  username: string;
  password: string;
}

/** Response shape from POST /api/auth/login and POST /api/auth/refresh. */
export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    accountId: string;
    roles: { id: string; name: string }[];
  };
}
