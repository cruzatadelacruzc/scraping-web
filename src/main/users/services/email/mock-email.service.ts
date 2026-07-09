import { inject, injectable } from 'inversify';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { IEmailService, ISendEmailOptions } from './email.service.interface';

/**
 * Development email service that logs emails to the injected {@link ILogger}
 * instead of sending them via SMTP.
 *
 * Selected when `EMAIL_PROVIDER` is unset or set to `mock`.
 */
@injectable()
export class MockEmailService implements IEmailService {
  public constructor(@inject(TYPES.Logger) private readonly _log: ILogger) {
    this._log.context = MockEmailService.name;
  }

  /**
   * Logs the email details at info level.
   *
   * @param options - The email to "send".
   */
  public async send(options: ISendEmailOptions): Promise<void> {
    this._log.info('[MockEmail] Sending email', {
      to: options.to,
      subject: options.subject,
      text: options.text.slice(0, 200),
    });
  }
}
