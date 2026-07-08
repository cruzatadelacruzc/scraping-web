import { RuleService } from '@admin/services/rule.service';
import { RuleNotFoundError } from '@scrapers/revolico/errors/rule-not-found.error';
import { RuleAlreadyExistsError } from '@scrapers/revolico/errors/rule-already-exists.error';

describe('RuleService', () => {
  let service: RuleService;
  let mockRepo: {
    findAll: jest.Mock;
    findByKey: jest.Mock;
    upsert: jest.Mock;
  };
  let mockRegistry: { invalidate: jest.Mock };
  let mockLogger: { warn: jest.Mock; info: jest.Mock; error: jest.Mock; context: string };

  const makeRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: 'uuid-1',
    ruleKey: 'brands',
    values: ['apple', 'samsung'],
    version: 1,
    enabled: true,
    createdAt: new Date('2026-07-08T12:00:00Z'),
    updatedAt: new Date('2026-07-08T13:00:00Z'),
    ...overrides,
  });

  beforeEach(() => {
    mockRepo = {
      findAll: jest.fn(),
      findByKey: jest.fn(),
      upsert: jest.fn(),
    };
    mockRegistry = { invalidate: jest.fn() };
    mockLogger = { warn: jest.fn(), info: jest.fn(), error: jest.fn(), context: '' };
    service = new RuleService(mockRepo as any, mockRegistry as any, mockLogger as any);
  });

  describe('list', () => {
    it('returns all rules mapped to DTOs', async () => {
      mockRepo.findAll.mockResolvedValue([makeRow()]);
      const result = await service.list();
      expect(result).toHaveLength(1);
      expect(result[0].ruleKey).toBe('brands');
      expect(result[0].values).toEqual(['apple', 'samsung']);
    });

    it('returns empty array when no rules exist', async () => {
      mockRepo.findAll.mockResolvedValue([]);
      const result = await service.list();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns the rule mapped to DTO', async () => {
      mockRepo.findByKey.mockResolvedValue(makeRow());
      const result = await service.findOne('brands');
      expect(result.ruleKey).toBe('brands');
    });

    it('throws RuleNotFoundError when rule does not exist', async () => {
      mockRepo.findByKey.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(RuleNotFoundError);
    });
  });

  describe('create', () => {
    it('throws RuleAlreadyExistsError on duplicate', async () => {
      mockRepo.findByKey.mockResolvedValue(makeRow());
      await expect(service.create('brands', ['x'])).rejects.toThrow(RuleAlreadyExistsError);
    });

    it('persists and invalidates cache on success', async () => {
      mockRepo.findByKey.mockResolvedValue(null);
      mockRepo.upsert.mockResolvedValue(makeRow());
      const result = await service.create('newRule', ['x', 'y']);
      expect(mockRepo.upsert).toHaveBeenCalledWith('newRule', ['x', 'y']);
      expect(mockRegistry.invalidate).toHaveBeenCalledWith('newRule');
      expect(result.ruleKey).toBe('brands');
    });
  });

  describe('update', () => {
    it('throws RuleNotFoundError when rule does not exist', async () => {
      mockRepo.findByKey.mockResolvedValue(null);
      await expect(service.update('missing', ['x'])).rejects.toThrow(RuleNotFoundError);
    });

    it('persists and invalidates cache on success', async () => {
      mockRepo.findByKey.mockResolvedValue(makeRow());
      mockRepo.upsert.mockResolvedValue(makeRow({ values: ['new-val'] }));
      const result = await service.update('brands', ['new-val']);
      expect(mockRepo.upsert).toHaveBeenCalledWith('brands', ['new-val']);
      expect(mockRegistry.invalidate).toHaveBeenCalledWith('brands');
      expect(result.values).toEqual(['new-val']);
    });
  });
});
