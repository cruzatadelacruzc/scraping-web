import { AppError } from '@shared/errors/app.error';

/**
 * Thrown when the requested role does not exist in the database.
 */
export class RoleNotFoundError extends AppError {
  public constructor(message = 'Role not found') {
    super(message, 404, 'ROLE_NOT_FOUND');
  }
}
