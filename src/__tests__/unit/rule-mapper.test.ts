import { toRuleResponseDTO } from '@admin/mappers/rule.mapper';

describe('toRuleResponseDTO', () => {
  it('transforms a Rule model to a response DTO with ISO date strings', () => {
    const model = {
      id: 'uuid-1',
      ruleKey: 'brands',
      values: ['apple', 'samsung'],
      version: 2,
      enabled: true,
      createdAt: new Date('2026-07-08T12:00:00Z'),
      updatedAt: new Date('2026-07-08T13:00:00Z'),
    };
    const dto = toRuleResponseDTO(model as any);
    expect(dto).toEqual({
      id: 'uuid-1',
      ruleKey: 'brands',
      values: ['apple', 'samsung'],
      version: 2,
      enabled: true,
      createdAt: '2026-07-08T12:00:00.000Z',
      updatedAt: '2026-07-08T13:00:00.000Z',
    });
  });

  it('handles empty values array', () => {
    const model = {
      id: '1',
      ruleKey: 'brands',
      values: [],
      version: 1,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const dto = toRuleResponseDTO(model as any);
    expect(dto.values).toEqual([]);
  });

  it('exposes the enabled flag as-is', () => {
    const model = {
      id: '1',
      ruleKey: 'brands',
      values: ['x'],
      version: 1,
      enabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const dto = toRuleResponseDTO(model as any);
    expect(dto.enabled).toBe(false);
  });
});
