import { z } from 'zod';

export const GenerateLinkCodeSchema = z.object({
  userId: z.string().uuid(),
  provider: z.enum(['telegram', 'whatsapp']).optional(),
});

export type GenerateLinkCodeInput = z.infer<typeof GenerateLinkCodeSchema>;

export class GenerateLinkCodeDTO {
  public readonly userId: string;
  public readonly provider?: string;

  private constructor(data: GenerateLinkCodeInput) {
    this.userId = data.userId;
    this.provider = data.provider;
  }

  /** Parses and validates the request body. */
  public static from(body: unknown): GenerateLinkCodeDTO {
    const parsed = GenerateLinkCodeSchema.parse(body);
    return new GenerateLinkCodeDTO(parsed);
  }
}
