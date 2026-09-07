import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { ArrowLeft, BellOff, BellRing, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ROUTES } from '@shared/config/routes';
import { normalizeError } from '@/shared/api/errors';
import { Button } from '@/shared/ui/forms';
import { Skeleton } from '@/shared/ui/skeleton';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { cn } from '@/shared/utils/cn';
import { useAlarm } from '../hooks/use-alarms';
import { useNotifications } from '../hooks/use-notifications';
import { useDeleteAlarm, useToggleAlarm } from '../hooks/use-alarm-mutations';
import { CONDITION_FIELD } from '../types';
import { formatAlarmValue, formatDateTime, formatPrice } from '../components/format-alarm-value';
import { selectAlarmTimeline } from '../components/alarm-detail/notification-timeline';

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-outline-variant bg-surface-container-low p-5">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        {title}
      </h2>
      <dl className="space-y-3">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="text-right text-on-surface">{children}</dd>
    </div>
  );
}

export default function AlarmDetailPage() {
  const { t, i18n } = useTranslation(['alarms', 'common']);
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const alarmQuery = useAlarm(id);
  const notificationsQuery = useNotifications();
  const toggle = useToggleAlarm();
  const del = useDeleteAlarm();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const dfLocale = i18n.language.startsWith('es') ? es : enUS;
  const entries = useMemo(
    () => selectAlarmTimeline(notificationsQuery.data, id),
    [notificationsQuery.data, id]
  );

  const backLink = (
    <Link
      to={ROUTES.ALARMS}
      className="inline-flex items-center gap-1 text-sm text-on-surface-variant transition-colors hover:text-on-surface"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {t('detail.back')}
    </Link>
  );

  if (alarmQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const errorStatus = alarmQuery.isError ? normalizeError(alarmQuery.error).status : undefined;

  if (alarmQuery.isError && errorStatus !== 404) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 py-16 text-center">
        <p className="text-sm text-on-surface-variant">{t('detail.loadError')}</p>
        <Button variant="outline" onClick={() => alarmQuery.refetch()}>
          {t('actions.retry', { ns: 'common' })}
        </Button>
        {backLink}
      </div>
    );
  }

  const alarm = alarmQuery.data;
  if (!alarm) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 py-16 text-center">
        <BellOff className="h-10 w-10 text-on-surface-variant" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-on-surface">{t('detail.notFound')}</h1>
        {backLink}
      </div>
    );
  }

  const hasNumericValue = CONDITION_FIELD[alarm.condition] !== 'none';

  const onToggle = () => {
    toggle.mutate(
      { id: alarm.id, enabled: !alarm.enabled },
      { onError: (e) => toast.error(normalizeError(e).message) }
    );
  };

  const onConfirmDelete = () => {
    del.mutate(alarm.id, { onSuccess: () => navigate(ROUTES.ALARMS) });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {backLink}

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-on-surface">{alarm.name}</h1>
          <a
            href={alarm.productUrl}
            target="_blank"
            rel="noreferrer"
            title={alarm.productUrl}
            className="mt-1 inline-flex max-w-md items-center gap-1 truncate text-sm text-on-surface-variant transition-colors hover:text-success"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{alarm.productUrl}</span>
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onToggle} disabled={toggle.isPending}>
            {t(alarm.enabled ? 'actions.disable' : 'actions.enable')}
          </Button>
          <Button variant="outline" asChild>
            <Link to={ROUTES.ALARM_EDIT(alarm.id)}>
              <Pencil className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('actions.edit')}
            </Link>
          </Button>
          <Button
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
            aria-label={t('delete.title')}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={t('detail.config')}>
          <Row label={t('columns.condition')}>{t(`conditions.${alarm.condition}`)}</Row>
          {hasNumericValue && (
            <Row label={t('columns.value')}>
              <span className="font-mono">{formatAlarmValue(alarm)}</span>
            </Row>
          )}
          <Row label={t('columns.state')}>
            <span
              className={cn(
                'rounded px-2 py-0.5 text-xs',
                alarm.enabled
                  ? 'bg-success/10 text-success'
                  : 'bg-surface-container-high text-on-surface-variant'
              )}
            >
              {t(alarm.enabled ? 'state.enabled' : 'state.disabled')}
            </span>
          </Row>
        </Card>

        <Card title={t('detail.status')}>
          <Row label={t('detail.lastEvaluated')}>
            <span className="font-mono">
              {formatDateTime(alarm.lastEvaluatedAt, t('detail.never'))}
            </span>
          </Row>
          <Row label={t('detail.lastEvaluatedPrice')}>
            <span className="font-mono">{formatPrice(alarm.lastEvaluatedPrice)}</span>
          </Row>
          <Row label={t('detail.lastMatched')}>
            <span className="font-mono">
              {formatDateTime(alarm.lastMatchedAt, t('detail.never'))}
            </span>
          </Row>
          <Row label={t('detail.lastNotified')}>
            <span className="font-mono">
              {formatDateTime(alarm.lastNotifiedAt, t('detail.never'))}
            </span>
          </Row>
        </Card>
      </div>

      <section className="rounded-lg border border-outline-variant bg-surface-container-low p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          {t('detail.timeline')}
        </h2>

        {notificationsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <BellOff className="h-8 w-8 text-on-surface-variant" aria-hidden="true" />
            <p className="text-sm font-medium text-on-surface">{t('detail.timelineEmptyTitle')}</p>
            <p className="text-sm text-on-surface-variant">
              {t('detail.timelineEmptyDescription')}
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start gap-3 rounded-md px-2 py-2.5 hover:bg-surface-container"
              >
                <BellRing
                  className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-variant"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-on-surface">{entry.title}</p>
                  <p className="truncate text-sm text-on-surface-variant">{entry.message}</p>
                </div>
                <time
                  className="shrink-0 font-mono text-xs text-on-surface-variant"
                  dateTime={entry.createdAt.toISOString()}
                >
                  {formatDistanceToNow(entry.createdAt, { addSuffix: true, locale: dfLocale })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onConfirmDelete}
        title={t('delete.title')}
        description={t('delete.description')}
        confirmLabel={t('delete.confirm')}
        pending={del.isPending}
      />
    </div>
  );
}
