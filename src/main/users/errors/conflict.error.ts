export class ConflictError extends Error {
  public status = 409;
  public constructor(message = 'Conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}
