import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  Lock,
  Percent,
  Search,
  Star,
  TrendingDown,
  TrendingUp,
  UserRoundCog,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { Input } from '@/shared/ui/forms';
import { ALL_CONDITIONS, type AlarmCondition } from '../types';

const CONDITION_ICON: Record<AlarmCondition, LucideIcon> = {
  PRICE_DROPS_BELOW: TrendingDown,
  PRICE_RISES_ABOVE: TrendingUp,
  PRICE_CHANGES_BY_PERCENT: Percent,
  VIEWS_EXCEED: Eye,
  IS_OUTSTANDING: Star,
  SELLER_CHANGED: UserRoundCog,
};

interface ConditionPickerProps {
  value: AlarmCondition;
  onChange: (condition: AlarmCondition) => void;
  /** Conditions the current plan allows. `null` = all allowed. */
  allowedConditions: AlarmCondition[] | null;
}

/**
 * Selectable grid of alarm conditions with a filter box. Built as a grid (not a
 * `<select>`) so it stays usable as the condition catalog grows; plan-locked
 * conditions render disabled with an upgrade hint.
 */
export function ConditionPicker({ value, onChange, allowedConditions }: ConditionPickerProps) {
  const { t } = useTranslation(['alarms', 'common']);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_CONDITIONS;
    return ALL_CONDITIONS.filter((c) => t(`conditions.${c}`).toLowerCase().includes(q));
  }, [query, t]);

  const isAllowed = (c: AlarmCondition) => !allowedConditions || allowedConditions.includes(c);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('form.searchCondition')}
          aria-label={t('form.searchCondition')}
          className="pl-8"
        />
      </div>

      <div
        role="radiogroup"
        aria-label={t('form.condition')}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      >
        {filtered.map((condition) => {
          const Icon = CONDITION_ICON[condition];
          const allowed = isAllowed(condition);
          const selected = value === condition;
          return (
            <button
              key={condition}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!allowed}
              onClick={() => onChange(condition)}
              className={cn(
                'flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected
                  ? 'border-success bg-success/10 text-on-surface'
                  : 'border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface',
                !allowed &&
                  'cursor-not-allowed opacity-50 hover:border-outline-variant hover:text-on-surface-variant'
              )}
            >
              <span className="flex items-center justify-between">
                <Icon className="h-4 w-4" aria-hidden="true" />
                {!allowed && <Lock className="h-3 w-3 text-warning" aria-hidden="true" />}
              </span>
              <span className="text-sm leading-tight">{t(`conditions.${condition}`)}</span>
              {!allowed && (
                <span className="text-[11px] leading-tight text-warning">
                  {t('form.conditionLocked')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && <p className="text-sm text-on-surface-variant">{t('noResults')}</p>}
    </div>
  );
}
