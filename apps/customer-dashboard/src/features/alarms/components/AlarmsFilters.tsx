import { useTranslation } from 'react-i18next';
import { ALL_CONDITIONS, type AlarmCondition } from '../types';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms';

export type AlarmStateFilter = 'all' | 'enabled' | 'disabled';
export type AlarmConditionFilter = AlarmCondition | 'all';

interface AlarmsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  condition: AlarmConditionFilter;
  onConditionChange: (value: AlarmConditionFilter) => void;
  state: AlarmStateFilter;
  onStateChange: (value: AlarmStateFilter) => void;
}

export function AlarmsFilters({
  search,
  onSearchChange,
  condition,
  onConditionChange,
  state,
  onStateChange,
}: AlarmsFiltersProps) {
  const { t } = useTranslation('alarms');

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t('search')}
        aria-label={t('search')}
        className="sm:max-w-xs"
      />
      <Select value={condition} onValueChange={(v) => onConditionChange(v as AlarmConditionFilter)}>
        <SelectTrigger className="sm:w-56" aria-label={t('filters.condition')}>
          <SelectValue placeholder={t('filters.allConditions')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.allConditions')}</SelectItem>
          {ALL_CONDITIONS.map((c) => (
            <SelectItem key={c} value={c}>
              {t(`conditions.${c}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={state} onValueChange={(v) => onStateChange(v as AlarmStateFilter)}>
        <SelectTrigger className="sm:w-40" aria-label={t('filters.state')}>
          <SelectValue placeholder={t('filters.allStates')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.allStates')}</SelectItem>
          <SelectItem value="enabled">{t('filters.enabled')}</SelectItem>
          <SelectItem value="disabled">{t('filters.disabled')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
