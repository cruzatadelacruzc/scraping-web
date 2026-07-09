import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { endpoint } from '../helpers/path-builder';
import { TAG } from '../tags';
import { Schemas } from '../schema-registry';

/**
 * Registers all account self-management endpoints:
 * password reset, email verification, password/email change, refresh tokens,
 * logout, account deactivation/reactivation, and OAuth provider linking.
 */
export function registerAccountManagementPaths(registry: OpenAPIRegistry): void {
  // ---------------------------------------------------------------------------
  // Password Reset
  // ---------------------------------------------------------------------------

  // POST /api/auth/forgot-password
  endpoint('post', '/api/auth/forgot-password')
    .tag(TAG.ACCOUNT_MANAGEMENT)
    .summary('Request a password reset email')
    .operationId('forgotPassword')
    .requestBody(Schemas.ForgotPasswordDTO)
    .response(200, 'Reset email sent (or silently ignored for unknown emails)', Schemas.MessageResponseDTO)
    .errors(400)
    .register(registry);

  // POST /api/auth/reset-password
  endpoint('post', '/api/auth/reset-password')
    .tag(TAG.ACCOUNT_MANAGEMENT)
    .summary('Reset password using a reset token')
    .operationId('resetPassword')
    .requestBody(Schemas.ResetPasswordDTO)
    .response(200, 'Password reset successfully', Schemas.MessageResponseDTO)
    .errors(400)
    .register(registry);

  // ---------------------------------------------------------------------------
  // Email Verification
  // ---------------------------------------------------------------------------

  // POST /api/auth/verify-email
  endpoint('post', '/api/auth/verify-email')
    .tag(TAG.ACCOUNT_MANAGEMENT)
    .summary('Verify an email address using a verification token')
    .operationId('verifyEmail')
    .requestBody(Schemas.VerifyEmailDTO)
    .response(200, 'Email verified successfully', Schemas.MessageResponseDTO)
    .errors(400)
    .register(registry);

  // POST /api/auth/send-verification-email
  endpoint('post', '/api/auth/send-verification-email')
    .tag(TAG.ACCOUNT_MANAGEMENT)
    .summary('Resend the email verification link')
    .operationId('sendVerificationEmail')
    .security('bearerAuth')
    .response(200, 'Verification email sent', Schemas.MessageResponseDTO)
    .errors(401)
    .register(registry);

  // ---------------------------------------------------------------------------
  // Change Password / Email
  // ---------------------------------------------------------------------------

  // PUT /api/auth/password
  endpoint('put', '/api/auth/password')
    .tag(TAG.ACCOUNT_MANAGEMENT)
    .summary('Change the authenticated user password')
    .operationId('changePassword')
    .security('bearerAuth')
    .requestBody(Schemas.ChangePasswordDTO)
    .response(200, 'Password changed successfully', Schemas.MessageResponseDTO)
    .errors(400, 401)
    .register(registry);

  // PUT /api/auth/email
  endpoint('put', '/api/auth/email')
    .tag(TAG.ACCOUNT_MANAGEMENT)
    .summary('Request an email change (verification sent to new address)')
    .operationId('changeEmail')
    .security('bearerAuth')
    .requestBody(Schemas.ChangeEmailDTO)
    .response(200, 'Verification email sent to new address', Schemas.MessageResponseDTO)
    .errors(400, 401)
    .register(registry);

  // ---------------------------------------------------------------------------
  // Refresh Token
  // ---------------------------------------------------------------------------

  // POST /api/auth/refresh
  endpoint('post', '/api/auth/refresh')
    .tag(TAG.ACCOUNT_MANAGEMENT)
    .summary('Rotate a refresh token and issue a new access token')
    .operationId('refreshToken')
    .requestBody(Schemas.RefreshTokenDTO)
    .response(200, 'New access and refresh tokens', Schemas.AuthResponseWithRefreshDTO)
    .errors(400)
    .register(registry);

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  // POST /api/auth/logout
  endpoint('post', '/api/auth/logout')
    .tag(TAG.ACCOUNT_MANAGEMENT)
    .summary('Logout — blacklist the current JWT and optionally revoke a refresh token')
    .operationId('logout')
    .security('bearerAuth')
    .requestBody(
      z.object({
        refreshToken: z.string().optional().openapi({ description: 'Optional refresh token to revoke' }),
      }),
    )
    .response(200, 'Logged out successfully', Schemas.MessageResponseDTO)
    .errors(401)
    .register(registry);

  // ---------------------------------------------------------------------------
  // Account Deactivation / Reactivation
  // ---------------------------------------------------------------------------

  // POST /api/auth/deactivate
  endpoint('post', '/api/auth/deactivate')
    .tag(TAG.ACCOUNT_MANAGEMENT)
    .summary('Deactivate the authenticated user account (soft-delete, 30-day grace period)')
    .operationId('deactivateAccount')
    .security('bearerAuth')
    .requestBody(Schemas.DeactivateAccountDTO)
    .response(200, 'Account deactivated', Schemas.MessageResponseDTO)
    .errors(400, 401)
    .register(registry);

  // POST /api/auth/reactivate
  endpoint('post', '/api/auth/reactivate')
    .tag(TAG.ACCOUNT_MANAGEMENT)
    .summary('Reactivate a deactivated user account (SUPER_ADMIN only)')
    .operationId('reactivateAccount')
    .security('bearerAuth')
    .requestBody(Schemas.ReactivateUserDTO)
    .response(200, 'Account reactivated', Schemas.MessageResponseDTO)
    .errors(400, 401, 403)
    .register(registry);

  // ---------------------------------------------------------------------------
  // OAuth Provider Linking
  // ---------------------------------------------------------------------------

  // POST /api/auth/link-provider
  endpoint('post', '/api/auth/link-provider')
    .tag(TAG.ACCOUNT_MANAGEMENT)
    .summary('Link an OAuth provider to the authenticated user account')
    .operationId('linkProvider')
    .security('bearerAuth')
    .requestBody(Schemas.LinkProviderDTO)
    .response(200, 'Provider linked successfully', Schemas.MessageResponseDTO)
    .errors(400, 401, 409)
    .register(registry);

  // DELETE /api/auth/link-provider/{provider}
  endpoint('delete', '/api/auth/link-provider/{provider}')
    .tag(TAG.ACCOUNT_MANAGEMENT)
    .summary('Unlink an OAuth provider from the authenticated user account')
    .operationId('unlinkProvider')
    .security('bearerAuth')
    .pathParamString('provider', 'Provider name (google | facebook)')
    .response(200, 'Provider unlinked successfully', Schemas.MessageResponseDTO)
    .errors(400, 401)
    .register(registry);
}
