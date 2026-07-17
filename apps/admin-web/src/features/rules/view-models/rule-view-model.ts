export interface RuleViewModel {
  id: string;
  ruleKey: string;
  values: string[];
  /** Derived: values.length for table display */
  valuesCount: number;
  version: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Computed badge config for the status column */
  statusBadge: { label: string; variant: 'success' | 'muted' };
}
