import { z } from 'zod';

export const LinkHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  action: z.enum(['CODE_GENERATED', 'CODE_VALIDATED', 'CODE_CONFIRMED', 'CODE_DENIED', 'CODE_EXPIRED', 'LINKED', 'UNLINKED']).optional(),
});

export type LinkHistoryQueryInput = z.infer<typeof LinkHistoryQuerySchema>;

export class LinkHistoryQueryDTO {
  public readonly page: number;
  public readonly pageSize: number;
  public readonly action?: string;

  private constructor(data: LinkHistoryQueryInput) {
    this.page = data.page;
    this.pageSize = data.pageSize;
    this.action = data.action;
  }

  /** Parses and validates query parameters. */
  public static from(body: unknown): LinkHistoryQueryDTO {
    const parsed = LinkHistoryQuerySchema.parse(body);
    return new LinkHistoryQueryDTO(parsed);
  }
}
