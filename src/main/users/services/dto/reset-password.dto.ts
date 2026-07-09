import { ValidationError } from '@shared/errors/validation.error';
import { z } from 'zod';

/**
 * Password validation: minimum 8 characters, at least one uppercase, one lowercase, and one number.
 * This follows OWASP basic password guidelines.
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});

export type ResetPasswordType = z.infer<typeof ResetPasswordSchema>;

export class ResetPasswordDTO {
  public constructor(
    public readonly token: string,
    public readonly newPassword: string,
  ) {}

  public static from(data: Partial<ResetPasswordType>): ResetPasswordDTO {
    try {
      const parsed = ResetPasswordSchema.parse(data);
      return new ResetPasswordDTO(parsed.token, parsed.newPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
