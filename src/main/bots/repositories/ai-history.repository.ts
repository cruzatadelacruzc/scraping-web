import { injectable } from 'inversify';
import { AiHistoryModel, IAiHistory } from '@bots/models/ai-history.model';

@injectable()
export class AiHistoryRepository {
  /**
   * Removes all history documents for an exact LangChain sessionId.
   */
  public async deleteBySessionId(sessionId: string): Promise<void> {
    await AiHistoryModel.deleteMany({ sessionId });
  }

  /**
   * Removes all history documents belonging to a tenant.
   * Matches any sessionId prefixed with `tenant:<accountId>:`.
   */
  public async deleteByAccountId(accountId: string): Promise<void> {
    await AiHistoryModel.deleteMany({ sessionId: { $regex: `^tenant:${accountId}:` } });
  }

  /**
   * Returns history documents for a given sessionId.
   */
  public async findBySessionId(sessionId: string): Promise<IAiHistory[]> {
    return AiHistoryModel.find({ sessionId });
  }
}
