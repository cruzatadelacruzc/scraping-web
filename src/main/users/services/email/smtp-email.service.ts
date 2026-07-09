import { inject, injectable } from 'inversify';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { IEmailService, ISendEmailOptions } from './email.service.interface';

/**
 * Production email service using nodemailer with SMTP.
 *
 * Configured via environment variables:
 * - `SMTP_HOST` (default: smtp.gmail.com)
 * - `SMTP_PORT` (default: 587)
 * - `SMTP_SECURE` (default: false)
 * - `SMTP_USER` — SMTP username / email
 * - `SMTP_PASS` — SMTP password or Gmail app password
 * - `EMAIL_FROM` — sender address (default: "BazaarSentinel <noreply@bazaarsentinel.com>")
 *
 * Selected when `EMAIL_PROVIDER=smtp`.
 */
@injectable()
export class SmtpEmailService implements IEmailService {
  private readonly _transporter: Transporter;
  private readonly _from: string;

  public constructor(@inject(TYPES.Logger) private readonly _log: ILogger) {
    this._log.context = SmtpEmailService.name;

    this._from = process.env.EMAIL_FROM ?? 'BazaarSentinel <noreply@bazaarsentinel.com>';

    this._transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER ?? '',
        pass: process.env.SMTP_PASS ?? '',
      },
    });
  }

  /**
   * Sends an email via the configured SMTP transport.
   *
   * @param options - The email to send.
   */
  public async send(options: ISendEmailOptions): Promise<void> {
    this._log.info('Sending email via SMTP', { to: options.to, subject: options.subject });

    await this._transporter.sendMail({
      from: this._from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  }
}
