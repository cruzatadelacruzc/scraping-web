import { inject, injectable } from 'inversify';
import { BotLinkCode, BotLinkCodeStatus } from '@prisma/client';
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
   * Persists a new link code record with status PENDING.
   */
  public async create(data: ICreateLinkCodeInput): Promise<BotLinkCode> {
    return this._prisma.botLinkCode.create({ data });
  }

  /**
   * Looks up a code record by its primary key.
   */
  public async findById(id: string): Promise<BotLinkCode | null> {
    return this._prisma.botLinkCode.findUnique({ where: { id } });
  }

  /**
   * Looks up a code record by its value (includes all statuses).
   */
  public async findByCode(code: string): Promise<BotLinkCode | null> {
    return this._prisma.botLinkCode.findFirst({ where: { code } });
  }

  /**
   * Marks a link code as consumed (legacy, kept for backward compatibility).
   * Prefer {@link markConsumed} which also sets the status field.
   */
  public async consume(id: string): Promise<BotLinkCode> {
    return this._prisma.botLinkCode.update({
      where: { id },
      data: { consumedAt: new Date(), status: BotLinkCodeStatus.CONSUMED },
    });
  }

  /**
   * Marks the code as VALIDATED — code was submitted via bot but not yet confirmed.
   */
  public async markValidated(id: string, validatedFrom: string, provider: string): Promise<BotLinkCode> {
    return this._prisma.botLinkCode.update({
      where: { id },
      data: {
        status: BotLinkCodeStatus.VALIDATED,
        validatedAt: new Date(),
        validatedFrom,
        provider,
        attemptCount: { increment: 1 },
      },
    });
  }

  /**
   * Marks the code as CONFIRMED — user approved the link in the web app.
   */
  public async markConfirmed(id: string): Promise<BotLinkCode> {
    return this._prisma.botLinkCode.update({
      where: { id },
      data: { status: BotLinkCodeStatus.CONFIRMED, confirmedAt: new Date() },
    });
  }

  /**
   * Marks the code as CONSUMED — link is fully complete.
   */
  public async markConsumed(id: string): Promise<BotLinkCode> {
    return this._prisma.botLinkCode.update({
      where: { id },
      data: { status: BotLinkCodeStatus.CONSUMED, consumedAt: new Date() },
    });
  }

  /**
   * Marks the code as REJECTED — user denied the link in the web app.
   */
  public async markRejected(id: string): Promise<BotLinkCode> {
    return this._prisma.botLinkCode.update({
      where: { id },
      data: { status: BotLinkCodeStatus.REJECTED, rejectedAt: new Date() },
    });
  }

  /**
   * Marks codes as EXPIRED — called by the cleanup job for codes past their TTL.
   */
  public async markExpired(ids: string[]): Promise<number> {
    const result = await this._prisma.botLinkCode.updateMany({
      where: {
        id: { in: ids },
        status: { in: [BotLinkCodeStatus.PENDING, BotLinkCodeStatus.VALIDATED] },
      },
      data: { status: BotLinkCodeStatus.EXPIRED },
    });
    return result.count;
  }

  /**
   * Increments the brute-force attempt counter for a code.
   */
  public async incrementAttempts(id: string): Promise<void> {
    await this._prisma.botLinkCode.update({
      where: { id },
      data: { attemptCount: { increment: 1 } },
    });
  }

  /**
   * Returns all expired codes with status PENDING or VALIDATED (for cleanup).
   */
  public async findExpiredPending(): Promise<BotLinkCode[]> {
    return this._prisma.botLinkCode.findMany({
      where: {
        expiresAt: { lt: new Date() },
        status: { in: [BotLinkCodeStatus.PENDING, BotLinkCodeStatus.VALIDATED] },
      },
    });
  }

  /**
   * Returns the most recent VALIDATED code for a user (for polling).
   */
  public async findPendingForUser(userId: string): Promise<BotLinkCode | null> {
    return this._prisma.botLinkCode.findFirst({
      where: { userId, status: BotLinkCodeStatus.VALIDATED },
      orderBy: { validatedAt: 'desc' },
    });
  }

  /**
   * Returns all expired, unconsumed codes (legacy — kept for existing cleanup jobs).
   */
  public async findExpired(): Promise<BotLinkCode[]> {
    return this._prisma.botLinkCode.findMany({
      where: { expiresAt: { lt: new Date() }, consumedAt: null },
    });
  }
}
