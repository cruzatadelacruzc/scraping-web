export const ruleKeys = {
  all: ['rules'] as const,
  list: (filters: Record<string, unknown>) => ['rules', 'list', filters] as const,
  detail: (ruleKey: string) => ['rules', 'detail', ruleKey] as const,
};
