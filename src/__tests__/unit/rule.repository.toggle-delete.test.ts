import { RuleRepository } from '@scrapers/services/attribute-extractor/repositories/rule.repository';
import { RuleNotFoundError } from '@scrapers/revolico/errors/rule-not-found.error';

describe('RuleRepository — toggleEnabled', () => {
  it('flips enabled from true to false', async () => {
    const mockPrisma = {
      rule: {
        findUnique: jest.fn().mockResolvedValue({ ruleKey: 'brands', enabled: true }),
        update: jest.fn().mockResolvedValue({ ruleKey: 'brands', enabled: false, values: [], version: 2 }),
      },
    };
    const repo = new RuleRepository(mockPrisma as any);
    const result = await repo.toggleEnabled('brands');
    expect(result.enabled).toBe(false);
    expect(mockPrisma.rule.update).toHaveBeenCalledWith({
      where: { ruleKey: 'brands' },
      data: { enabled: false },
    });
  });

  it('throws RuleNotFoundError when ruleKey does not exist', async () => {
    const mockPrisma = {
      rule: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const repo = new RuleRepository(mockPrisma as any);
    await expect(repo.toggleEnabled('missing')).rejects.toThrow(RuleNotFoundError);
  });
});

describe('RuleRepository — delete', () => {
  it('returns true and deletes when rule exists', async () => {
    const mockPrisma = {
      rule: {
        findUnique: jest.fn().mockResolvedValue({ ruleKey: 'brands' }),
        delete: jest.fn().mockResolvedValue(undefined),
      },
    };
    const repo = new RuleRepository(mockPrisma as any);
    const result = await repo.delete('brands');
    expect(result).toBe(true);
    expect(mockPrisma.rule.delete).toHaveBeenCalledWith({ where: { ruleKey: 'brands' } });
  });

  it('returns false when rule does not exist', async () => {
    const mockPrisma = {
      rule: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const repo = new RuleRepository(mockPrisma as any);
    const result = await repo.delete('missing');
    expect(result).toBe(false);
  });
});
