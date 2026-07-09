import { ValidationError } from '@shared/errors/validation.error';
import { z } from 'zod';

export const ChangeEmailSchema = z.object({
  newEmail: z
    .string()
    .email()
    .transform(v => v.toLowerCase()),
  password: z.string().min(1),
});

export type ChangeEmailType = z.infer<typeof ChangeEmailSchema>;

export class ChangeEmailDTO {
  public constructor(
    public readonly newEmail: string,
    public readonly password: string,
  ) {}

  public static from(data: Partial<ChangeEmailType>): ChangeEmailDTO {
    try {
      const parsed = ChangeEmailSchema.parse(data);
      return new ChangeEmailDTO(parsed.newEmail, parsed.password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
