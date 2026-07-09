import { inject, injectable } from 'inversify';
import { IQueueModule } from '@shared/queue-module.interface';
import { IJobContext } from '@shared/queue/port/job-context.interfaces';
import { IEmailService } from '@users/services/email/email.service.interface';
import { IEmailContent, EmailTemplateService } from '@users/services/email/email-template.service';
import { TYPES } from '@shared/types.container';
import { ILogger } from '@shared/logger.interface';
import { container } from '@shared/container';

/** Queue name for email sending jobs. */
export const EMAIL_SEND_JOB = 'EMAIL_SEND_JOB';

/** Discriminated union of transactional email types. */
export enum EmailJobType {
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  EMAIL_CHANGE_NOTIFICATION = 'EMAIL_CHANGE_NOTIFICATION',
  ACCOUNT_DEACTIVATED = 'ACCOUNT_DEACTIVATED',
  ACCOUNT_REACTIVATED = 'ACCOUNT_REACTIVATED',
}

/**
 * Payload enqueued on the `EMAIL_SEND_JOB` queue.
 */
export interface IEmailJobData {
  type: EmailJobType;
  to: string;
  token?: string;
  extra?: Record<string, unknown>;
}

/** Base URL used to build links in transactional emails. */
const BASE_URL = process.env.WEB_APP_BASE_URL ?? 'http://localhost:3000';

@injectable()
export class EmailQueues implements IQueueModule {
  public constructor(@inject(TYPES.Logger) private readonly _log: ILogger) {
    this._log.context = EmailQueues.name;
  }

  /** @inheritdoc */
  public getModuleNmame(): string {
    return 'EmailQueues';
  }

  /** @inheritdoc */
  public getQueuesToInitialize(): string[] {
    return [EMAIL_SEND_JOB];
  }

  /** @inheritdoc */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getProcessor(_queueName: string): (ctx: IJobContext<IEmailJobData>) => Promise<void> {
    return async (ctx: IJobContext<IEmailJobData>): Promise<void> => {
      const { type, to, token, extra } = ctx.data;
      const emailService = container.get<IEmailService>(TYPES.EmailService);

      let content: IEmailContent;

      switch (type) {
        case EmailJobType.PASSWORD_RESET:
          content = EmailTemplateService.passwordReset(token!, BASE_URL);
          break;
        case EmailJobType.EMAIL_VERIFICATION:
          content = EmailTemplateService.emailVerification(token!, BASE_URL);
          break;
        case EmailJobType.EMAIL_CHANGE_NOTIFICATION:
          content = EmailTemplateService.emailChangeNotification(extra?.oldEmail as string, extra?.newEmail as string);
          break;
        case EmailJobType.ACCOUNT_DEACTIVATED:
          content = EmailTemplateService.accountDeactivated(30);
          break;
        case EmailJobType.ACCOUNT_REACTIVATED:
          content = EmailTemplateService.accountReactivated();
          break;
        default:
          this._log.warn('Unknown email job type', { type });
          return;
      }

      await emailService.send({ to, subject: content.subject, text: content.text, html: content.html });
      this._log.info('Email sent successfully', { type, to });
    };
  }

  /** @inheritdoc */
  public setupQueueListeners(): void {
    // Listeners are registered by the queue adapter via onCompleted/onFailed.
    // No-op: the processor itself handles logging.
  }
}
