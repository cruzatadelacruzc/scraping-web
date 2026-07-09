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

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export type ChangePasswordType = z.infer<typeof ChangePasswordSchema>;

export class ChangePasswordDTO {
  public constructor(
    public readonly currentPassword: string,
    public readonly newPassword: string,
  ) {}

  public static from(data: Partial<ChangePasswordType>): ChangePasswordDTO {
    try {
      const parsed = ChangePasswordSchema.parse(data);
      return new ChangePasswordDTO(parsed.currentPassword, parsed.newPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
