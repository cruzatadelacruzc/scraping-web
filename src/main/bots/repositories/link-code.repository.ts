import { inject, injectable } from 'inversify';
import { BotLinkCode } from '@prisma/client';
import { TYPES } from '@shared/types.container';
import { PrismaClientType } from '@users/custom-prisma-client';

export interface ICreateLinkCodeInput {
  code: string;
  userId: string;
  accountId: string;
  expiresAt: Date;
}

@injectable()
export class LinkCodeRepository {
  public constructor(@inject(TYPES.PrismaClient) private readonly _prisma: PrismaClientType) {}

  /**
   * Persists a new link code record.
   */
  public async create(data: ICreateLinkCodeInput): Promise<BotLinkCode> {
    return this._prisma.botLinkCode.create({ data });
  }

  /**
   * Looks up an unconsumed code by its value.
   */
  public async findByCode(code: string): Promise<BotLinkCode | null> {
    return this._prisma.botLinkCode.findFirst({ where: { code } });
  }

  /**
   * Marks a link code as consumed by setting consumedAt to now.
   */
  public async consume(id: string): Promise<BotLinkCode> {
    return this._prisma.botLinkCode.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }

  /**
   * Returns all expired, unconsumed codes (for cleanup jobs).
   */
  public async findExpired(): Promise<BotLinkCode[]> {
    return this._prisma.botLinkCode.findMany({
      where: { expiresAt: { lt: new Date() }, consumedAt: null },
    });
  }
}
