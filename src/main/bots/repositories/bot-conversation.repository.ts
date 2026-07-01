import { inject, injectable } from 'inversify';
import { BotConversation } from '@prisma/client';
import { TYPES } from '@shared/types.container';
import { PrismaClientType } from '@users/custom-prisma-client';

export interface IUpsertConversationInput {
  provider: string;
  externalId: string;
  accountId: string;
}

@injectable()
export class BotConversationRepository {
  public constructor(@inject(TYPES.PrismaClient) private readonly _prisma: PrismaClientType) {}

  /**
   * Creates or updates a conversation record keyed by (provider, externalId).
   * On update, only lastActivity is refreshed — other fields are preserved.
   */
  public async upsert(data: IUpsertConversationInput): Promise<BotConversation> {
    return this._prisma.botConversation.upsert({
      where: { provider_externalId: { provider: data.provider, externalId: data.externalId } },
      create: data,
      update: { lastActivity: new Date() },
    });
  }

  /**
   * Finds the conversation for an incoming message by transport coordinates.
   */
  public async findByExternalId(provider: string, externalId: string): Promise<BotConversation | null> {
    return this._prisma.botConversation.findFirst({ where: { provider, externalId } });
  }

  /**
   * Associates a platform user with this conversation after successful code validation.
   */
  public async linkUser(id: string, userId: string): Promise<BotConversation> {
    return this._prisma.botConversation.update({ where: { id }, data: { userId } });
  }

  /**
   * Stamps the conversation with the current time (called on every inbound message).
   */
  public async updateLastActivity(id: string): Promise<void> {
    await this._prisma.botConversation.update({ where: { id }, data: { lastActivity: new Date() } });
  }

  /**
   * Stores the user's preferred language for future messages.
   */
  public async updatePreferredLang(id: string, lang: string): Promise<BotConversation> {
    return this._prisma.botConversation.update({ where: { id }, data: { preferredLang: lang } });
  }
}
