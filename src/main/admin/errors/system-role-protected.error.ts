import { AppError } from '@shared/errors/app.error';

/**
 * Thrown when attempting to deactivate a protected system role (SUPER_ADMIN).
 */
export class SystemRoleProtectedError extends AppError {
  public constructor(message = 'The SUPER_ADMIN role cannot be deactivated') {
    super(message, 409, 'SYSTEM_ROLE_PROTECTED');
  }
}
