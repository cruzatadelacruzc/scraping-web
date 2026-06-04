interface IValidationErrorDetail {
  code?: string;
  message: string;
  path?: (string | number)[];
}

export class ValidationError extends Error {
  public constructor(
    public validationErrors: IValidationErrorDetail[],
    message: string = `error:validation`,
  ) {
    super(message);
    Object.setPrototypeOf(this, ValidationError.prototype);
    this.validationErrors = validationErrors;
  }
}
