import { ValidationError } from '@shared/errors/validation.error';
import { z } from 'zod';

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshTokenType = z.infer<typeof RefreshTokenSchema>;

export class RefreshTokenDTO {
  public constructor(public readonly refreshToken: string) {}

  public static from(data: Partial<RefreshTokenType>): RefreshTokenDTO {
    try {
      const parsed = RefreshTokenSchema.parse(data);
      return new RefreshTokenDTO(parsed.refreshToken);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
