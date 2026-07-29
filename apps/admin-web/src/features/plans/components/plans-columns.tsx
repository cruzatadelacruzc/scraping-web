/**
 * Column definitions for the plans table.
 *
 * Each column config specifies an i18n header key and whether the values
 * should be rendered with right-alignment (numeric columns).
 */

export interface PlanColumn {
  /** Unique column identifier */
  key: string;
  /** i18n key for the column header */
  headerKey: string;
  /** Right-align numeric values */
  isNumeric?: boolean;
}

export const PLAN_COLUMNS: readonly PlanColumn[] = [
  { key: 'name', headerKey: 'plans.table.name' },
  { key: 'price', headerKey: 'plans.table.price', isNumeric: true },
  { key: 'maxAlarms', headerKey: 'plans.table.maxAlarms', isNumeric: true },
  { key: 'conditions', headerKey: 'plans.table.conditions', isNumeric: true },
  { key: 'channels', headerKey: 'plans.table.channels' },
  { key: 'ai', headerKey: 'plans.table.ai' },
  { key: 'subscribers', headerKey: 'plans.table.subscribers', isNumeric: true },
];
