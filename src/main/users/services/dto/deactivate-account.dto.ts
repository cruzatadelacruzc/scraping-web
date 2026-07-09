import { ValidationError } from '@shared/errors/validation.error';
import { z } from 'zod';

export const DeactivateAccountSchema = z.object({
  password: z.string().min(1),
  confirmDeactivation: z.literal(true),
});

export type DeactivateAccountType = z.infer<typeof DeactivateAccountSchema>;

export class DeactivateAccountDTO {
  public constructor(
    public readonly password: string,
    public readonly confirmDeactivation: boolean,
  ) {}

  public static from(data: Partial<DeactivateAccountType>): DeactivateAccountDTO {
    try {
      const parsed = DeactivateAccountSchema.parse(data);
      return new DeactivateAccountDTO(parsed.password, parsed.confirmDeactivation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
