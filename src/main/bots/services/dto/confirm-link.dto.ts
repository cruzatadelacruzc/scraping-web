import { z } from 'zod';

export const ConfirmLinkSchema = z.object({
  codeId: z.string().uuid(),
  action: z.enum(['confirm', 'deny']),
});

export type ConfirmLinkInput = z.infer<typeof ConfirmLinkSchema>;

export class ConfirmLinkDTO {
  public readonly codeId: string;
  public readonly action: 'confirm' | 'deny';

  private constructor(data: ConfirmLinkInput) {
    this.codeId = data.codeId;
    this.action = data.action;
  }

  /** Parses and validates the request body. */
  public static from(body: unknown): ConfirmLinkDTO {
    const parsed = ConfirmLinkSchema.parse(body);
    return new ConfirmLinkDTO(parsed);
  }
}
