import { AppError } from '@shared/errors/app.error';

export class PageLoadError extends AppError {
  public constructor(status: number = 500, url: string) {
    super(`Failed to load page: ${url} with status ${status}`, 502, 'PAGE_LOAD_FAILED');
  }
}
