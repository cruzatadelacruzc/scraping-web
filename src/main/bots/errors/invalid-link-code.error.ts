export class InvalidLinkCodeError extends Error {
  public constructor(public readonly code: string) {
    super(`Invalid or expired link code: ${code}`);
    this.name = 'InvalidLinkCodeError';
  }
}
