import { ValidationError } from '@shared/errors/validation.error';
import { z } from 'zod';

export const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});

export type VerifyEmailType = z.infer<typeof VerifyEmailSchema>;

export class VerifyEmailDTO {
  public constructor(public readonly token: string) {}

  public static from(data: Partial<VerifyEmailType>): VerifyEmailDTO {
    try {
      const parsed = VerifyEmailSchema.parse(data);
      return new VerifyEmailDTO(parsed.token);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
