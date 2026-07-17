import { Rule as RuleModel } from '@prisma/client';

/**
 * Response shape exposed by the Rule admin API.
 */
export interface IRuleResponseDTO {
  id: string;
  ruleKey: string;
  values: string[];
  version: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pure function — transforms a Prisma Rule model into an API response DTO.
 * No side effects, no I/O, no logger.
 *
 * @param {RuleModel} model - The Prisma Rule row.
 * @returns {IRuleResponseDTO} The response-safe DTO with ISO date strings.
 */
export function toRuleResponseDTO(model: RuleModel): IRuleResponseDTO {
  return {
    id: model.id,
    ruleKey: model.ruleKey,
    values: model.values as string[],
    version: model.version,
    enabled: model.enabled,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  };
}
