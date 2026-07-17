import { RuleRepository } from '@scrapers/services/attribute-extractor/repositories/rule.repository';

describe('RuleRepository', () => {
  let repo: RuleRepository;
  let mockPrisma: {
    rule: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      rule: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
    };
    repo = new RuleRepository(mockPrisma as any);
  });

  describe('findByKey', () => {
    it('returns the rule when found', async () => {
      const row = {
        id: '1',
        ruleKey: 'brands',
        values: ['apple'],
        version: 1,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.rule.findUnique.mockResolvedValue(row);
      const result = await repo.findByKey('brands');
      expect(result).toEqual(row);
    });

    it('returns null when not found', async () => {
      mockPrisma.rule.findUnique.mockResolvedValue(null);
      const result = await repo.findByKey('missing');
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns all rules ordered by ruleKey asc', async () => {
      const rows = [
        { id: '1', ruleKey: 'brands', values: ['apple'], version: 1, enabled: true, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', ruleKey: 'colors', values: ['red'], version: 1, enabled: true, createdAt: new Date(), updatedAt: new Date() },
      ];
      mockPrisma.rule.findMany.mockResolvedValue(rows);
      const result = await repo.findAll();
      expect(result).toEqual(rows);
      expect(mockPrisma.rule.findMany).toHaveBeenCalledWith({ orderBy: { ruleKey: 'asc' } });
    });
  });

  describe('findAllEnabled', () => {
    it('filters by enabled = true', async () => {
      await repo.findAllEnabled();
      expect(mockPrisma.rule.findMany).toHaveBeenCalledWith({ where: { enabled: true } });
    });
  });

  describe('upsert', () => {
    it('creates or updates a rule with version increment', async () => {
      const row = {
        id: '1',
        ruleKey: 'brands',
        values: ['apple'],
        version: 1,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.rule.upsert.mockResolvedValue(row);
      const result = await repo.upsert('brands', ['apple']);
      expect(result).toEqual(row);
      expect(mockPrisma.rule.upsert).toHaveBeenCalledWith({
        where: { ruleKey: 'brands' },
        create: { ruleKey: 'brands', values: ['apple'] },
        update: { values: ['apple'], version: { increment: 1 } },
      });
    });
  });
});
