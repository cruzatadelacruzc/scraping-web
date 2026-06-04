import { z } from 'zod';
import { ValidationError } from '@shared/errors/validation.error';
import { RoleSchema, RoleType as RoleDTOType } from './role.dto';

export const UserSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  email: z.string().email(),
  username: z.string().nonempty(),
  displayName: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  emailVerified: z.boolean().optional(),
  roles: z.array(RoleSchema).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type UserType = z.infer<typeof UserSchema>;

export class UserDTO {
  public constructor(
    public readonly id: string,
    public readonly accountId: string,
    public readonly email: string,
    public readonly username: string,
    public readonly displayName?: string,
    public readonly avatarUrl?: string,
    public readonly emailVerified?: boolean,
    public readonly roles?: RoleDTOType[],
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  public static from(data: Partial<UserType>): UserDTO {
    try {
      const parsed = UserSchema.parse(data);
      return new UserDTO(
        parsed.id,
        parsed.accountId,
        parsed.email,
        parsed.username,
        parsed.displayName,
        parsed.avatarUrl,
        parsed.emailVerified,
        parsed.roles,
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
