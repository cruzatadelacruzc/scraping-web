import { ValidationError } from '@shared/errors/validation.error';
import { z } from 'zod';

export const RoleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export type RoleType = z.infer<typeof RoleSchema>;

export class RoleDTO {
  public constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}

  public static from(data: Partial<RoleType>): RoleDTO {
    try {
      const parsed = RoleSchema.parse(data);
      return new RoleDTO(parsed.id, parsed.name);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
