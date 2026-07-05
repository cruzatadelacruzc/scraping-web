import { inject, injectable } from 'inversify';
import { BotLinkAudit, BotLinkAction } from '@prisma/client';
import { TYPES } from '@shared/types.container';
import { PrismaClientType } from '@users/custom-prisma-client';

export interface ICreateAuditInput {
  accountId: string;
  userId: string;
  action: BotLinkAction;
  code?: string;
  codeId?: string;
  provider?: string;
  externalId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

@injectable()
export class LinkAuditRepository {
  public constructor(@inject(TYPES.PrismaClient) private readonly _prisma: PrismaClientType) {}

  /**
   * Writes an audit entry for a link/unlink action.
   */
  public async log(input: ICreateAuditInput): Promise<BotLinkAudit> {
    return this._prisma.botLinkAudit.create({ data: input });
  }

  /**
   * Returns paginated audit entries for a user's account.
   */
  public async findByAccountId(
    accountId: string,
    page: number,
    pageSize: number,
    action?: string,
  ): Promise<{ entries: BotLinkAudit[]; total: number }> {
    const where: Record<string, unknown> = { accountId };
    if (action) {
      where.action = action;
    }

    const [entries, total] = await Promise.all([
      this._prisma.botLinkAudit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this._prisma.botLinkAudit.count({ where }),
    ]);

    return { entries, total };
  }
}
