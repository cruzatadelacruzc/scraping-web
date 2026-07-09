import { ValidationError } from '@shared/errors/validation.error';
import { z } from 'zod';
import { ProviderType } from '@prisma/client';

export const LinkProviderSchema = z.object({
  provider: z.nativeEnum(ProviderType),
  providerId: z.string().min(1),
  idToken: z.string().optional(),
  accessToken: z.string().optional(),
});

export type LinkProviderType = z.infer<typeof LinkProviderSchema>;

export class LinkProviderDTO {
  public constructor(
    public readonly provider: ProviderType,
    public readonly providerId: string,
    public readonly idToken?: string,
    public readonly accessToken?: string,
  ) {}

  public static from(data: Partial<LinkProviderType>): LinkProviderDTO {
    try {
      const parsed = LinkProviderSchema.parse(data);
      return new LinkProviderDTO(parsed.provider, parsed.providerId, parsed.idToken, parsed.accessToken);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
