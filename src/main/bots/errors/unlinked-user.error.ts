import { AppError } from '@shared/errors/app.error';

export class UnlinkedUserError extends AppError {
  public constructor(public readonly preferredLang: string) {
    super('User is not linked to a bot conversation', 403, 'UNLINKED_USER');
  }
}
