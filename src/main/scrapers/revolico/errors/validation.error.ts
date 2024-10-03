interface ValidationErrorDetail {
  code?: string;
  message: string;
  path?: (string | number)[];
}

export class ValidationError extends Error {
  constructor(
    public validationErrors: ValidationErrorDetail[],
    message: string = `error:validation`,
  ) {
    super(message);
    Object.setPrototypeOf(this, ValidationError.prototype);
    this.validationErrors = validationErrors;
  }
}
