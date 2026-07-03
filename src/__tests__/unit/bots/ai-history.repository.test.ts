import 'reflect-metadata';
import { AiHistoryRepository } from '@bots/repositories/ai-history.repository';

jest.mock('@bots/models/ai-history.model', () => ({
  AiHistoryModel: {
    deleteMany: jest.fn(),
    find: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AiHistoryModel } = require('@bots/models/ai-history.model');

describe('AiHistoryRepository', () => {
  let repo: AiHistoryRepository;

  const sessionId = 'tenant:tenant-1:user:user-1:conv:conv-1';
  const fakeDocs = [{ sessionId, messages: [], createdAt: new Date() }];

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new AiHistoryRepository();
  });

  describe('deleteBySessionId', () => {
    it('deletes docs matching exact sessionId', async () => {
      AiHistoryModel.deleteMany.mockResolvedValueOnce({ deletedCount: 1 });

      await repo.deleteBySessionId(sessionId);

      expect(AiHistoryModel.deleteMany).toHaveBeenCalledWith({ sessionId });
    });

    it('propagates errors', async () => {
      AiHistoryModel.deleteMany.mockRejectedValueOnce(new Error('mongo error'));
      await expect(repo.deleteBySessionId(sessionId)).rejects.toThrow('mongo error');
    });
  });

  describe('deleteByAccountId', () => {
    it('deletes all docs whose sessionId starts with tenant:<accountId>:', async () => {
      AiHistoryModel.deleteMany.mockResolvedValueOnce({ deletedCount: 3 });

      await repo.deleteByAccountId('tenant-1');

      expect(AiHistoryModel.deleteMany).toHaveBeenCalledWith({
        sessionId: { $regex: '^tenant:tenant-1:' },
      });
    });

    it('propagates errors', async () => {
      AiHistoryModel.deleteMany.mockRejectedValueOnce(new Error('mongo error'));
      await expect(repo.deleteByAccountId('tenant-1')).rejects.toThrow('mongo error');
    });
  });

  describe('findBySessionId', () => {
    it('returns docs matching exact sessionId', async () => {
      AiHistoryModel.find.mockResolvedValueOnce(fakeDocs);

      const result = await repo.findBySessionId(sessionId);

      expect(AiHistoryModel.find).toHaveBeenCalledWith({ sessionId });
      expect(result).toEqual(fakeDocs);
    });

    it('returns empty array when none found', async () => {
      AiHistoryModel.find.mockResolvedValueOnce([]);
      const result = await repo.findBySessionId(sessionId);
      expect(result).toEqual([]);
    });

    it('propagates errors', async () => {
      AiHistoryModel.find.mockRejectedValueOnce(new Error('mongo error'));
      await expect(repo.findBySessionId(sessionId)).rejects.toThrow('mongo error');
    });
  });
});
