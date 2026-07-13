/**
 * Result of a successful refresh token rotation, carrying user context
 * so the caller can issue a new JWT without an additional DB round-trip.
 */
export interface IRefreshTokenResult {
  /** The new opaque refresh token to return to the client. */
  refreshToken: string;
  /** ID of the user who owns this refresh token. */
  userId: string;
  /** Account (tenant) ID the user belongs to. */
  accountId: string;
  /** Role names assigned to the user (e.g. ACCOUNT_OWNER, SUPER_ADMIN). */
  roles: string[];
}
