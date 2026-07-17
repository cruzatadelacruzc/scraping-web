/**
 * Rendered email content (plain text + optional HTML).
 */
export interface IEmailContent {
  subject: string;
  text: string;
  html: string;
}

/**
 * Pure helpers that build email bodies for transactional flows.
 * No dependencies — callers resolve the `baseUrl` from configuration.
 */
export class EmailTemplateService {
  /**
   * Builds a password-reset email.
   *
   * @param token    - The raw reset token to embed in the link.
   * @param baseUrl  - The frontend origin (e.g. `https://app.example.com`).
   */
  public static passwordReset(token: string, baseUrl: string): IEmailContent {
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const subject = 'Password Reset Request';

    const text = [
      'You requested a password reset.',
      '',
      `Click the link below to reset your password (expires in 1 hour):`,
      resetUrl,
      '',
      'If you did not request this, please ignore this email.',
    ].join('\n');

    const html = [
      '<p>You requested a password reset.</p>',
      `<p><a href="${resetUrl}">Click here to reset your password</a> (expires in 1 hour).</p>`,
      '<p>If you did not request this, please ignore this email.</p>',
    ].join('\n');

    return { subject, text, html };
  }

  /**
   * Builds an email-verification email.
   *
   * @param token   - The raw verification token.
   * @param baseUrl - The frontend origin.
   */
  public static emailVerification(token: string, baseUrl: string): IEmailContent {
    const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
    const subject = 'Verify Your Email Address';

    const text = [
      'Please verify your email address.',
      '',
      `Click the link below to confirm your email (expires in 24 hours):`,
      verifyUrl,
      '',
      'If you did not create an account, please ignore this email.',
    ].join('\n');

    const html = [
      '<p>Please verify your email address.</p>',
      `<p><a href="${verifyUrl}">Click here to verify your email</a> (expires in 24 hours).</p>`,
      '<p>If you did not create an account, please ignore this email.</p>',
    ].join('\n');

    return { subject, text, html };
  }

  /**
   * Builds a notification email when a user changes their email address.
   *
   * @param oldEmail - The previous email address.
   * @param newEmail - The new email address.
   */
  public static emailChangeNotification(oldEmail: string, newEmail: string): IEmailContent {
    const subject = 'Email Address Changed';

    const text = [
      'Your email address has been changed.',
      '',
      `Old email: ${oldEmail}`,
      `New email: ${newEmail}`,
      '',
      'If you did not request this change, please contact support immediately.',
    ].join('\n');

    const html = [
      '<p>Your email address has been changed.</p>',
      '<ul>',
      `<li>Old email: <strong>${oldEmail}</strong></li>`,
      `<li>New email: <strong>${newEmail}</strong></li>`,
      '</ul>',
      '<p>If you did not request this change, please contact support immediately.</p>',
    ].join('\n');

    return { subject, text, html };
  }

  /**
   * Builds a confirmation email when an account is deactivated.
   *
   * @param daysUntilPurge - How long before personal data is purged.
   */
  public static accountDeactivated(daysUntilPurge: number): IEmailContent {
    const subject = 'Account Deactivated';

    const text = [
      'Your account has been deactivated.',
      '',
      `Your data will be preserved for ${daysUntilPurge} days.`,
      'If you wish to reactivate your account, please contact support before that period expires.',
    ].join('\n');

    const html = [
      '<p>Your account has been deactivated.</p>',
      `<p>Your data will be preserved for <strong>${daysUntilPurge} days</strong>.</p>`,
      '<p>If you wish to reactivate your account, please contact support before that period expires.</p>',
    ].join('\n');

    return { subject, text, html };
  }

  /**
   * Builds a notification email when an account is reactivated.
   */
  public static accountReactivated(): IEmailContent {
    const subject = 'Account Reactivated';

    const text = ['Your account has been reactivated.', '', 'You can now log in and resume using BazaarSentinel.'].join('\n');

    const html = ['<p>Your account has been reactivated.</p>', '<p>You can now log in and resume using BazaarSentinel.</p>'].join('\n');

    return { subject, text, html };
  }
}
