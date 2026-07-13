import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BarChart3, Bell, CalendarPlus, Layers, UserPlus } from 'lucide-react';
import { KpiCard } from '@features/dashboard/components/kpi-card';
import { useDashboardMetrics, useEnrichmentMetrics, useHealthStatus } from '@features/dashboard/hooks/useDashboard';
import { ROUTES } from '@shared/config/routes';
import { ENV } from '@shared/config/env';

export function DashboardPage(): JSX.Element {
  const { t } = useTranslation();
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useDashboardMetrics();
  const { data: health, isLoading: healthLoading } = useHealthStatus();
  const { data: enrichment, isLoading: enrichmentLoading } = useEnrichmentMetrics();

  return (
    <div className="space-y-xl">
      <h1 className="text-headline-lg text-on-surface">{t('dashboard.title')}</h1>

      {metricsError && (
        <div className="rounded-md border border-danger bg-danger-muted p-md text-sm text-danger">
          {t('common.error')}
        </div>
      )}

      {/* KPIs */}
      <section>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label={t('dashboard.totalAccounts')} value={metrics?.totalAccounts ?? 0} isLoading={metricsLoading} />
          <KpiCard label={t('dashboard.activeUsers')} value={metrics?.totalUsers ?? 0} isLoading={metricsLoading} />
          <KpiCard label={t('dashboard.productsScraped')} value={metrics?.productCount ?? 0} isLoading={metricsLoading} />
          <KpiCard label={t('dashboard.activeSubscriptions')} value={metrics?.activeSubscriptions ?? 0} isLoading={metricsLoading} />
        </div>
      </section>

      {/* Health + Enrichment */}
      <div className="grid grid-cols-1 gap-md lg:grid-cols-2">
        <section className="rounded-md border border-outline-variant bg-surface-container p-md">
          <h2 className="flex items-center gap-sm text-lg font-semibold text-on-surface">
            <Bell size={18} />
            {t('dashboard.systemHealth')}
          </h2>
          {healthLoading ? (
            <div className="mt-md space-y-sm">
              {[1, 2, 3].map((i) => (<div key={i} className="h-6 animate-pulse rounded-sm bg-surface-container-high" />))}
            </div>
          ) : health ? (
            <ul className="mt-md space-y-sm">
              {health.services.map((svc) => (
                <li key={svc.service} className="flex items-center gap-sm">
                  <span className={`inline-block h-2 w-2 rounded-full ${svc.status === 'connected' ? 'bg-success' : 'bg-danger'}`} />
                  <span className="text-body-sm font-mono text-on-surface-variant">{svc.service}</span>
                  <span className={`text-body-sm font-mono ${svc.status === 'connected' ? 'text-success' : 'text-danger'}`}>{svc.status}</span>
                  {svc.error && <span className="text-body-sm text-danger">{svc.error}</span>}
                </li>
              ))}
            </ul>
          ) : <p className="mt-md text-body-sm text-on-surface-variant">{t('common.noData')}</p>}
        </section>

        <section className="rounded-md border border-outline-variant bg-surface-container p-md">
          <h2 className="flex items-center gap-sm text-lg font-semibold text-on-surface">
            <BarChart3 size={18} />
            {t('dashboard.enrichment')}
          </h2>
          {enrichmentLoading ? (
            <div className="mt-md grid grid-cols-2 gap-sm">
              {[1, 2, 3, 4].map((i) => (<div key={i} className="h-10 animate-pulse rounded-sm bg-surface-container-high" />))}
            </div>
          ) : enrichment ? (
            <div className="mt-md grid grid-cols-2 gap-sm">
              <MetricItem label={t('dashboard.cacheHitRate')} value={`${(enrichment.cacheHitsRate * 100).toFixed(1)}%`} />
              <MetricItem label={t('dashboard.llmCalls')} value={enrichment.llmCalls.toLocaleString()} />
              <MetricItem label={t('dashboard.totalEnrichments')} value={enrichment.totalEnrichments.toLocaleString()} />
              <MetricItem label={t('dashboard.estimatedSavings')} value={`$${enrichment.estimatedSavings.toFixed(2)}`} />
            </div>
          ) : <p className="mt-md text-body-sm text-on-surface-variant">{t('common.noData')}</p>}
        </section>
      </div>

      {/* Rules at a Glance + Quick Actions */}
      <div className="grid grid-cols-1 gap-md lg:grid-cols-2">
        <section className="rounded-md border border-outline-variant bg-surface-container p-md">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-sm text-lg font-semibold text-on-surface">
              <Layers size={18} />
              {t('dashboard.rulesAtGlance')}
            </h2>
            <Link to={ROUTES.RULES} className="flex items-center gap-xs text-body-sm text-primary hover:underline">
              {t('dashboard.viewRules')} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="mt-md space-y-sm">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-on-surface-variant">{t('dashboard.rulesErrors')}</span>
              <span className="text-body-sm font-mono text-warning">0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-on-surface-variant">{t('dashboard.rulesLastModified')}</span>
              <span className="text-body-sm font-mono text-on-surface-variant">—</span>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-outline-variant bg-surface-container p-md">
          <h2 className="flex items-center gap-sm text-lg font-semibold text-on-surface">
            {t('dashboard.quickActions')}
          </h2>
          <div className="mt-md grid grid-cols-2 gap-sm">
            <QuickAction icon={<UserPlus size={16} />} label={t('dashboard.newAccount')} to={ROUTES.ACCOUNTS} />
            <QuickAction icon={<CalendarPlus size={16} />} label={t('dashboard.newSchedule')} to={ROUTES.SCRAPERS} />
            <QuickAction icon={<Layers size={16} />} label={t('dashboard.viewQueues')} to={ROUTES.QUEUES} />
            <QuickAction icon={<BarChart3 size={16} />} label={t('dashboard.viewAccounts')} to={ROUTES.ACCOUNTS} />
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <p className="text-label-xs font-mono text-on-surface-variant">{label}</p>
      <p className="mt-xs text-body-md font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function QuickAction({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }): JSX.Element {
  return (
    <Link
      to={to}
      className="flex items-center gap-xs rounded-md border border-outline-variant px-sm py-xs text-body-sm text-on-surface-variant transition-colors hover:border-primary hover:text-on-surface"
    >
      {icon}
      {label}
    </Link>
  );
}
