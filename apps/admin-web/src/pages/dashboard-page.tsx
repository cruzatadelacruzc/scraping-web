import { useTranslation } from 'react-i18next';
import { KpiCard } from '@features/dashboard/components/kpi-card';
import { useDashboard } from '@features/dashboard/hooks/useDashboard';

export function DashboardPage(): JSX.Element {
  const { t } = useTranslation();
  const { data, isLoading, error } = useDashboard();

  return (
    <div>
      <h1 className="text-headline-lg text-on-surface">{t('dashboard.title')}</h1>

      {error && (
        <div className="mt-lg rounded-md border border-danger bg-danger-muted p-md text-sm text-danger">
          {t('common.error')}
        </div>
      )}

      <div className="mt-lg grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t('dashboard.totalAccounts')}
          value={data?.totalAccounts ?? 0}
          isLoading={isLoading}
        />
        <KpiCard
          label={t('dashboard.activeUsers')}
          value={data?.activeUsers ?? 0}
          delta={12}
          isLoading={isLoading}
        />
        <KpiCard
          label={t('dashboard.productsScraped')}
          value={data?.productsScraped ?? 0}
          isLoading={isLoading}
        />
        <KpiCard
          label={t('dashboard.alarmsFiring')}
          value={data?.alarmsFiring ?? 0}
          delta={-2}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
