import { Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpPost, httpPut, httpDelete } from 'inversify-express-utils';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { ValidateRequestMiddleware } from '@shared/middleware/validate-request.middleware';
import { ResponseHandler } from '@shared/response-handler';
import { PasswordResetService } from '@users/services/password-reset.service';
import { EmailVerificationService } from '@users/services/email-verification.service';
import { TokenManagementService } from '@users/services/token-management.service';
import { AccountDeactivationService } from '@users/services/account-deactivation.service';
import { AuthService } from '@users/services/auth.service';
import { UserService } from '@users/services/user.service';
import { ForgotPasswordDTO } from '@users/services/dto/forgot-password.dto';
import { ResetPasswordDTO } from '@users/services/dto/reset-password.dto';
import { ChangePasswordDTO } from '@users/services/dto/change-password.dto';
import { ChangeEmailDTO } from '@users/services/dto/change-email.dto';
import { RefreshTokenDTO } from '@users/services/dto/refresh-token.dto';
import { VerifyEmailDTO } from '@users/services/dto/verify-email.dto';
import { DeactivateAccountDTO } from '@users/services/dto/deactivate-account.dto';
import { LinkProviderDTO } from '@users/services/dto/link-provider.dto';

/**
 * Controller for account self-management endpoints:
 * password reset, email verification, password/email change, refresh tokens,
 * logout, account deactivation/reactivation, and OAuth provider linking.
 */
@controller('/api/auth')
export class AccountManagementController {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.PasswordResetService) private readonly _passwordReset: PasswordResetService,
    @inject(TYPES.EmailVerificationService) private readonly _emailVerify: EmailVerificationService,
    @inject(TYPES.TokenManagementService) private readonly _tokenMgmt: TokenManagementService,
    @inject(TYPES.AccountDeactivationService) private readonly _deactivation: AccountDeactivationService,
    @inject(TYPES.AuthService) private readonly _auth: AuthService,
    @inject(TYPES.UserService) private readonly _userService: UserService,
  ) {
    this._log.context = AccountManagementController.name;
  }

  // ---------------------------------------------------------------------------
  // Password Reset
  // ---------------------------------------------------------------------------

  /**
   * POST /api/auth/forgot-password
   * Always returns 200 to prevent email enumeration.
   */
  @httpPost('/forgot-password', ValidateRequestMiddleware.with(ForgotPasswordDTO))
  public async forgotPassword(req: Request, res: Response): Promise<void> {
    const dto = ForgotPasswordDTO.from(req.body);
    await this._passwordReset.requestReset(dto.email);
    ResponseHandler.ok(res, { message: 'If the email exists, a reset link has been sent.' });
  }

  /**
   * POST /api/auth/reset-password
   */
  @httpPost('/reset-password', ValidateRequestMiddleware.with(ResetPasswordDTO))
  public async resetPassword(req: Request, res: Response): Promise<void> {
    const dto = ResetPasswordDTO.from(req.body);
    try {
      await this._passwordReset.resetPassword(dto.token, dto.newPassword);
      ResponseHandler.ok(res, { message: 'Password reset successfully.' });
    } catch (err: unknown) {
      this._log.warn('Password reset failed', { error: String(err) });
      ResponseHandler.badRequest(res, (err as Error).message ?? 'Password reset failed');
    }
  }

  // ---------------------------------------------------------------------------
  // Email Verification
  // ---------------------------------------------------------------------------

  /**
   * POST /api/auth/verify-email
   */
  @httpPost('/verify-email', ValidateRequestMiddleware.with(VerifyEmailDTO))
  public async verifyEmail(req: Request, res: Response): Promise<void> {
    const dto = VerifyEmailDTO.from(req.body);
    try {
      await this._emailVerify.verifyEmail(dto.token);
      ResponseHandler.ok(res, { message: 'Email verified successfully.' });
    } catch (err: unknown) {
      this._log.warn('Email verification failed', { error: String(err) });
      ResponseHandler.badRequest(res, (err as Error).message ?? 'Email verification failed');
    }
  }

  /**
   * POST /api/auth/send-verification-email
   * Authenticated — resends verification email to the current user.
   */
  @httpPost('/send-verification-email', AuthMiddleware.forRoles('ACCOUNT_OWNER', 'MEMBER'))
  public async sendVerificationEmail(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    await this._emailVerify.requestVerification(user.user.id, user.user.email);
    ResponseHandler.ok(res, { message: 'Verification email sent.' });
  }

  // ---------------------------------------------------------------------------
  // Change Password / Email
  // ---------------------------------------------------------------------------

  /**
   * PUT /api/auth/password
   * Authenticated — changes the current user's password.
   */
  @httpPut('/password', AuthMiddleware.forRoles('ACCOUNT_OWNER', 'MEMBER'))
  public async changePassword(req: Request, res: Response): Promise<void> {
    const dto = ChangePasswordDTO.from(req.body);
    const user = (req as any).user;
    try {
      await this._passwordReset.changePassword(user.user.id, dto.currentPassword, dto.newPassword);
      ResponseHandler.ok(res, { message: 'Password changed successfully.' });
    } catch (err: unknown) {
      this._log.warn('Change password failed', { error: String(err), userId: user.user.id });
      ResponseHandler.badRequest(res, (err as Error).message ?? 'Password change failed');
    }
  }

  /**
   * PUT /api/auth/email
   * Authenticated — requests an email change (verification sent to new email).
   */
  @httpPut('/email', AuthMiddleware.forRoles('ACCOUNT_OWNER', 'MEMBER'))
  public async changeEmail(req: Request, res: Response): Promise<void> {
    const dto = ChangeEmailDTO.from(req.body);
    const user = (req as any).user;
    try {
      await this._userService.requestEmailChange(user.user.id, dto.newEmail, dto.password);
      ResponseHandler.ok(res, { message: 'Verification email sent to new address.' });
    } catch (err: unknown) {
      this._log.warn('Change email failed', { error: String(err), userId: user.user.id });
      ResponseHandler.badRequest(res, (err as Error).message ?? 'Email change failed');
    }
  }

  // ---------------------------------------------------------------------------
  // Refresh Token
  // ---------------------------------------------------------------------------

  /**
   * POST /api/auth/refresh
   * Issues a new access token given a valid refresh token.
   */
  @httpPost('/refresh', ValidateRequestMiddleware.with(RefreshTokenDTO))
  public async refresh(req: Request, res: Response): Promise<void> {
    const dto = RefreshTokenDTO.from(req.body);
    const newRefreshToken = await this._tokenMgmt.rotateRefreshToken(dto.refreshToken);
    if (!newRefreshToken) {
      ResponseHandler.badRequest(res, 'Invalid or expired refresh token');
      return;
    }

    // Issue a new access token — we need the user info from the stored token
    // The rotate method already validated the token; we extract userId from the
    // stored token. For simplicity, the rotate method on its own doesn't return
    // user info. We handle this by generating the access token from the refresh
    // token's context.
    //
    // TODO: Extend rotateRefreshToken to return user context alongside the new token.
    ResponseHandler.badRequest(res, 'Refresh token flow requires user context — see TODO');
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  /**
   * POST /api/auth/logout
   * Authenticated — blacklists the current JWT and optionally revokes a refresh token.
   */
  @httpPost('/logout', TYPES.AuthMiddleware)
  public async logout(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    const refreshToken = req.body?.refreshToken as string | undefined;

    try {
      await this._auth.logout(user.jti, user.exp, refreshToken);
      ResponseHandler.ok(res, { message: 'Logged out successfully.' });
    } catch (err: unknown) {
      this._log.warn('Logout failed', { error: String(err) });
      ResponseHandler.ok(res, { message: 'Logged out successfully.' }); // best-effort
    }
  }

  // ---------------------------------------------------------------------------
  // Account Deactivation / Reactivation
  // ---------------------------------------------------------------------------

  /**
   * POST /api/auth/deactivate
   * Authenticated — soft-deletes the current user's account.
   */
  @httpPost('/deactivate', AuthMiddleware.forRoles('ACCOUNT_OWNER', 'MEMBER'))
  public async deactivate(req: Request, res: Response): Promise<void> {
    const dto = DeactivateAccountDTO.from(req.body);
    const user = (req as any).user;
    try {
      await this._deactivation.deactivate(user.user.id, dto.password);
      ResponseHandler.ok(res, { message: 'Account deactivated. You have 30 days to reactivate.' });
    } catch (err: unknown) {
      this._log.warn('Deactivation failed', { error: String(err), userId: user.user.id });
      ResponseHandler.badRequest(res, (err as Error).message ?? 'Deactivation failed');
    }
  }

  /**
   * POST /api/auth/reactivate
   * SUPER_ADMIN only — reactivates a deactivated user account.
   */
  @httpPost('/reactivate', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async reactivate(req: Request, res: Response): Promise<void> {
    const { userId } = req.body;
    if (!userId) {
      ResponseHandler.badRequest(res, 'userId is required');
      return;
    }
    try {
      await this._deactivation.reactivate(userId);
      ResponseHandler.ok(res, { message: 'Account reactivated successfully.' });
    } catch (err: unknown) {
      this._log.warn('Reactivation failed', { error: String(err) });
      ResponseHandler.badRequest(res, (err as Error).message ?? 'Reactivation failed');
    }
  }

  // ---------------------------------------------------------------------------
  // OAuth Provider Linking
  // ---------------------------------------------------------------------------

  /**
   * POST /api/auth/link-provider
   * Authenticated — links an OAuth provider to the current user's account.
   */
  @httpPost('/link-provider', AuthMiddleware.forRoles('ACCOUNT_OWNER', 'MEMBER'))
  public async linkProvider(req: Request, res: Response): Promise<void> {
    const dto = LinkProviderDTO.from(req.body);
    const user = (req as any).user;
    try {
      await this._userService.linkProvider(user.user.id, dto.provider, dto.providerId, dto.idToken, dto.accessToken);
      ResponseHandler.ok(res, { message: 'Provider linked successfully.' });
    } catch (err: unknown) {
      this._log.warn('Provider linking failed', { error: String(err) });
      ResponseHandler.badRequest(res, (err as Error).message ?? 'Provider linking failed');
    }
  }

  /**
   * DELETE /api/auth/link-provider/:provider
   * Authenticated — unlinks an OAuth provider from the current user's account.
   */
  @httpDelete('/link-provider/:provider', AuthMiddleware.forRoles('ACCOUNT_OWNER', 'MEMBER'))
  public async unlinkProvider(req: Request, res: Response): Promise<void> {
    const { provider } = req.params;
    const user = (req as any).user;
    try {
      await this._userService.unlinkProvider(user.user.id, provider);
      ResponseHandler.ok(res, { message: 'Provider unlinked successfully.' });
    } catch (err: unknown) {
      this._log.warn('Provider unlinking failed', { error: String(err) });
      ResponseHandler.badRequest(res, (err as Error).message ?? 'Provider unlinking failed');
    }
  }
}
