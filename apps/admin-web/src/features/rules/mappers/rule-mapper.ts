import type { RuleDTO } from '../services/rules-service';
import type { RuleViewModel } from '../view-models/rule-view-model';

/**
 * Transforms a backend RuleDTO into a UI-oriented RuleViewModel.
 * Pure function — no side effects, no API calls.
 */
export function mapRuleDTOToViewModel(dto: RuleDTO): RuleViewModel {
  return {
    id: dto.id,
    ruleKey: dto.ruleKey,
    values: dto.values,
    valuesCount: dto.values.length,
    version: dto.version,
    enabled: dto.enabled,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    statusBadge: dto.enabled
      ? { label: 'Active', variant: 'success' }
      : { label: 'Inactive', variant: 'muted' },
  };
}
