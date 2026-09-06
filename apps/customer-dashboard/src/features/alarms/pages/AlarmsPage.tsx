import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ROUTES } from '@shared/config/routes';
import { normalizeError } from '@/shared/api/errors';
import { Button } from '@/shared/ui/forms';
import { Skeleton } from '@/shared/ui/skeleton';
import { useAlarms } from '../hooks/use-alarms';
import { useToggleAlarm } from '../hooks/use-alarm-mutations';
import { usePlanLimits } from '../hooks/use-plan-limits';
import {
  AlarmsFilters,
  type AlarmConditionFilter,
  type AlarmStateFilter,
} from '../components/AlarmsFilters';
import { AlarmsTable } from '../components/AlarmsTable';
import { OfflineBanner } from '../components/alarm-list/offline-banner';

export default function AlarmsPage() {
  const { t } = useTranslation('alarms');
  const alarmsQuery = useAlarms();
  const planLimits = usePlanLimits();
  const toggle = useToggleAlarm();

  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState<AlarmConditionFilter>('all');
  const [state, setState] = useState<AlarmStateFilter>('all');

  const filtered = useMemo(() => {
    const all = alarmsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return all.filter((a) => {
      if (q && !a.name.toLowerCase().includes(q) && !a.productUrl.toLowerCase().includes(q)) {
        return false;
      }
      if (condition !== 'all' && a.condition !== condition) return false;
      if (state === 'enabled' && !a.enabled) return false;
      if (state === 'disabled' && a.enabled) return false;
      return true;
    });
  }, [alarmsQuery.data, search, condition, state]);

  const onToggle = (id: string, enabled: boolean) => {
    toggle.mutate({ id, enabled }, { onError: (e) => toast.error(normalizeError(e).message) });
  };

  return (
    <div className="space-y-4">
      <OfflineBanner />
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-on-surface">{t('title')}</h1>
          <p className="text-sm text-on-surface-variant">{t('subtitle')}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {!planLimits.atLimit && (
            <Button asChild>
              <Link to={ROUTES.ALARM_NEW}>{t('create')}</Link>
            </Button>
          )}
          {!planLimits.isLoading && (
            <span className="font-mono text-xs text-on-surface-variant">
              {planLimits.isUnlimited
                ? t('usageUnlimited', { used: planLimits.used })
                : t('usage', { used: planLimits.used, max: planLimits.maxAlarms ?? 0 })}
            </span>
          )}
          {planLimits.atLimit && <span className="text-xs text-warning">{t('atLimit')}</span>}
        </div>
      </header>

      {alarmsQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : alarmsQuery.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-outline-variant p-8 text-center">
          <p className="text-sm text-on-surface-variant">
            {t('common:states.error', { ns: 'common' })}
          </p>
          <Button variant="outline" onClick={() => alarmsQuery.refetch()}>
            {t('actions.retry', { ns: 'common' })}
          </Button>
        </div>
      ) : (alarmsQuery.data?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-outline-variant p-8 text-center">
          <h2 className="text-base font-semibold text-on-surface">{t('empty.title')}</h2>
          <p className="text-sm text-on-surface-variant">{t('empty.description')}</p>
          <Button asChild className="mt-2">
            <Link to={ROUTES.ALARM_NEW}>{t('empty.cta')}</Link>
          </Button>
        </div>
      ) : (
        <>
          <AlarmsFilters
            search={search}
            onSearchChange={setSearch}
            condition={condition}
            onConditionChange={setCondition}
            state={state}
            onStateChange={setState}
          />
          {filtered.length === 0 ? (
            <p className="rounded-lg border border-outline-variant p-6 text-center text-sm text-on-surface-variant">
              {t('noResults')}
            </p>
          ) : (
            <AlarmsTable
              alarms={filtered}
              onToggle={onToggle}
              togglingId={toggle.isPending ? toggle.variables?.id : undefined}
            />
          )}
        </>
      )}
    </div>
  );
}
