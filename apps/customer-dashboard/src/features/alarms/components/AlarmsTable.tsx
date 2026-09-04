import { useTranslation } from 'react-i18next';
import { Eye, Pencil, Pause, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@shared/config/routes';
import { cn } from '@/shared/utils/cn';
import type { AlarmViewModel } from '../types';
import { formatAlarmValue } from './format-alarm-value';

interface AlarmsTableProps {
  alarms: AlarmViewModel[];
  onToggle: (id: string, enabled: boolean) => void;
  togglingId?: string;
}

export function AlarmsTable({ alarms, onToggle, togglingId }: AlarmsTableProps) {
  const { t } = useTranslation('alarms');

  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant">
      <table className="w-full text-sm">
        <caption className="sr-only">{t('title')}</caption>
        <thead>
          <tr className="border-b border-outline-variant text-left text-xs text-on-surface-variant">
            <th className="px-3 py-2 font-medium">{t('columns.name')}</th>
            <th className="px-3 py-2 font-medium">{t('columns.condition')}</th>
            <th className="px-3 py-2 font-medium">{t('columns.value')}</th>
            <th className="px-3 py-2 font-medium">{t('columns.state')}</th>
            <th className="px-3 py-2 font-medium">{t('columns.lastMatch')}</th>
            <th className="px-3 py-2 font-medium">
              <span className="sr-only">{t('actions.edit')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {alarms.map((a) => (
            <tr
              key={a.id}
              className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container-high"
            >
              <td className="px-3 py-2 text-on-surface">{a.name}</td>
              <td className="px-3 py-2 text-on-surface-variant">{t(`conditions.${a.condition}`)}</td>
              <td className="px-3 py-2 font-mono text-on-surface">{formatAlarmValue(a)}</td>
              <td className="px-3 py-2">
                <span
                  className={cn(
                    'rounded px-2 py-0.5 text-xs',
                    a.enabled
                      ? 'bg-success/10 text-success'
                      : 'bg-surface-container-high text-on-surface-variant'
                  )}
                >
                  {t(a.enabled ? 'state.enabled' : 'state.disabled')}
                </span>
              </td>
              <td className="px-3 py-2 font-mono text-on-surface-variant">
                {a.lastMatchedAt ? a.lastMatchedAt.toLocaleDateString() : t('detail.never')}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    to={ROUTES.ALARM_DETAIL(a.id)}
                    aria-label={t('actions.view')}
                    className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    to={ROUTES.ALARM_EDIT(a.id)}
                    aria-label={t('actions.edit')}
                    className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => onToggle(a.id, !a.enabled)}
                    disabled={togglingId === a.id}
                    aria-label={t(a.enabled ? 'actions.disable' : 'actions.enable')}
                    className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface disabled:opacity-50"
                  >
                    {a.enabled ? (
                      <Pause className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Play className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
