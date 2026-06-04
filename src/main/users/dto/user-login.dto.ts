import { ValidationError } from '@shared/errors/validation.error';
import { z } from 'zod';

export const UserLoginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username or email is required')
    .transform(val => val.toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type UserLoginType = z.infer<typeof UserLoginSchema>;

export class UserLoginDTO {
  public constructor(
    public readonly username: string,
    public readonly password: string,
  ) {}

  public static from(data: Partial<UserLoginType>): UserLoginDTO {
    try {
      const parsed = UserLoginSchema.parse(data);
      return new UserLoginDTO(parsed.username, parsed.password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
