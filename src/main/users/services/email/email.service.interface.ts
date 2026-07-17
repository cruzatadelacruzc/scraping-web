/**
 * Options for sending a single email.
 */
export interface ISendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Port for email delivery. Implementations include {@link MockEmailService}
 * (development) and {@link SmtpEmailService} (production via nodemailer).
 */
export interface IEmailService {
  /**
   * Sends a single email.
   *
   * @param options - The email recipient, subject, and body.
   * @throws if the underlying transport fails.
   */
  send(options: ISendEmailOptions): Promise<void>;
}
