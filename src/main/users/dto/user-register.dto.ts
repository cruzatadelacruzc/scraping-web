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

/**
 * Username validation: 3-30 characters, alphanumeric plus hyphens and underscores.
 * Enforces lowercase to prevent duplicates via case variance.
 */
const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must not exceed 30 characters')
  .transform(v => v.toLowerCase())
  .refine(v => /^[a-z0-9_-]+$/.test(v), 'Username can only contain lowercase letters, numbers, hyphens, and underscores');

export const UserRegisterSchema = z.object({
  accountId: z.string().uuid(),
  email: z
    .string()
    .email()
    .transform(v => v.toLowerCase()),
  username: usernameSchema,
  password: passwordSchema,
  roleIds: z.array(z.string().uuid()).optional(),
  displayName: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type UserRegisterType = z.infer<typeof UserRegisterSchema>;

export class UserRegisterDTO {
  public constructor(
    public readonly email: string,
    public readonly username: string,
    public readonly password: string,
    public readonly accountId?: string,
    public readonly roleIds?: string[],
    public readonly displayName?: string,
    public readonly avatarUrl?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  public static from(data: Partial<UserRegisterType>): UserRegisterDTO {
    try {
      const parsed = UserRegisterSchema.parse(data);
      return new UserRegisterDTO(
        parsed.email,
        parsed.username,
        parsed.password,
        parsed.accountId,
        parsed.roleIds,
        parsed.displayName,
        parsed.avatarUrl,
        parsed.createdAt,
        parsed.updatedAt,
      );
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
