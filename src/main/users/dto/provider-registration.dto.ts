import { ValidationError } from '@shared/errors/validation.error';
import { z } from 'zod';
import { ProviderType } from '@prisma/client';

export const ProviderRegistrationSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  provider: z.nativeEnum(ProviderType),
  providerId: z.string(),
  accountId: z.string().uuid(),
  displayName: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  idToken: z.string().optional(),
  accessToken: z.string().optional(),
});

export type ProviderRegistrationType = z.infer<typeof ProviderRegistrationSchema>;

export class ProviderRegistrationDTO {
  public constructor(
    public readonly email: string,
    public readonly username: string,
    public readonly provider: ProviderType,
    public readonly providerId: string,
    public readonly accountId: string,
    public readonly displayName?: string,
    public readonly avatarUrl?: string,
    public readonly idToken?: string,
    public readonly accessToken?: string,
  ) {}

  public static from(data: Partial<ProviderRegistrationType>): ProviderRegistrationDTO {
    try {
      const parsed = ProviderRegistrationSchema.parse(data);
      return new ProviderRegistrationDTO(
        parsed.email,
        parsed.username,
        parsed.provider,
        parsed.providerId,
        parsed.accountId,
        parsed.displayName,
        parsed.avatarUrl,
        parsed.idToken,
        parsed.accessToken,
      );
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
