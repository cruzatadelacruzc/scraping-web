import { AppError } from '@shared/errors/app.error';

/**
 * Thrown when attempting to assign a deactivated role to a user.
 */
export class RoleInactiveError extends AppError {
  public constructor(message = 'Role is deactivated and cannot be assigned') {
    super(message, 409, 'ROLE_INACTIVE');
  }
}
