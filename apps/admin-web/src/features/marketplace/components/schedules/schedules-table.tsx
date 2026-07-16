import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertDialog } from '@shared/ui/alert-dialog';
import type { DropdownMenuItem } from '@shared/ui/dropdown-menu';
import { DropdownMenu } from '@shared/ui/dropdown-menu';
import { format } from 'date-fns';

import { useDeleteSchedule } from '../../hooks/useDeleteSchedule';
import { useGetSchedules } from '../../hooks/useGetSchedules';
import { useToggleSchedule } from '../../hooks/useToggleSchedule';
import type { ScheduleListViewModel } from '../../view-models/schedule-view-model';

interface SchedulesTableProps {
  /** Called when the user wants to edit a schedule */
  onEdit: (schedule: ScheduleListViewModel) => void;
  /** Called when the user wants to create a new schedule */
  onCreate: () => void;
}

/**
 * Displays scraping schedules in a compact table with inline toggle,
 * row actions (Edit, Delete), and full 4-state handling.
 */
export function SchedulesTable({ onEdit, onCreate }: SchedulesTableProps): JSX.Element {
  const { t } = useTranslation();
  const { data, isLoading, isError, error, isFetching, refetch } = useGetSchedules();
  const deleteMutation = useDeleteSchedule();
  const toggleMutation = useToggleSchedule();

  // Format lastRunAt with fallback
  const formatLastRun = useCallback(
    (date: Date | null): string => {
      if (!date) return t('scrapers.schedules.table.never');
      try {
        return format(date, 'MMM d, yyyy HH:mm');
      } catch {
        return t('scrapers.schedules.table.never');
      }
    },
    [t],
  );

  // 1. Loading
  if (isLoading) {
    return (
      <div className="space-y-sm">
        <div className="h-9 animate-pulse rounded-sm bg-surface-container-high" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-sm bg-surface-container-high" />
        ))}
      </div>
    );
  }

  // 2. Error
  if (isError) {
    return (
      <div className="rounded-md border border-danger bg-danger-muted p-md text-sm">
        <p className="text-danger">
          {error instanceof Error ? error.message : t('scrapers.schedules.error.message')}
        </p>
        <button
          onClick={refetch}
          className="mt-sm rounded-sm bg-danger px-3 py-1 text-sm text-white transition-colors hover:bg-danger/80"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  // 3. Empty
  if (!data || data.length === 0) {
    return (
      <div className="py-xl text-center">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="mx-auto text-on-surface-variant"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <p className="mt-md text-lg font-semibold text-on-surface">
          {t('scrapers.schedules.empty.title')}
        </p>
        <p className="mt-sm text-body-sm text-on-surface-variant">
          {t('scrapers.schedules.empty.description')}
        </p>
        <button
          onClick={onCreate}
          className="mt-md rounded-sm bg-primary px-3 py-1.5 text-body-sm text-white transition-colors hover:bg-primary-hover"
        >
          {t('scrapers.schedules.empty.create')}
        </button>
      </div>
    );
  }

  // 4. Data
  return (
    <div>
      {/* Header + Create button */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-body-xs text-on-surface-variant">
          {t('scrapers.schedules.table.count', { count: data.length })}
        </p>
        <button
          onClick={onCreate}
          className="rounded-sm bg-primary px-3 py-1 text-body-xs text-white transition-colors hover:bg-primary-hover"
        >
          {t('scrapers.schedules.table.create')}
        </button>
      </div>

      {/* Background refetch bar */}
      {isFetching && <div className="h-0.5 w-full animate-pulse bg-primary/20" />}

      {/* Table */}
      <div className="overflow-x-auto rounded-sm border border-outline-variant">
        <table className="w-full border-collapse text-body-sm">
          <caption className="sr-only">{t('scrapers.schedules.table.caption')}</caption>
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low">
              <th className="p-2 text-left font-medium text-on-surface-variant">
                {t('scrapers.schedules.table.name')}
              </th>
              <th className="p-2 text-left font-medium text-on-surface-variant">
                {t('scrapers.schedules.table.store')}
              </th>
              <th className="p-2 text-left font-medium text-on-surface-variant">
                {t('scrapers.schedules.table.cron')}
              </th>
              <th className="p-2 text-left font-medium text-on-surface-variant">
                {t('scrapers.schedules.table.enabled')}
              </th>
              <th className="p-2 text-left font-medium text-on-surface-variant">
                {t('scrapers.schedules.table.lastRun')}
              </th>
              <th className="p-2 text-left font-medium text-on-surface-variant">
                {t('scrapers.schedules.table.jobsCount')}
              </th>
              <th className="w-10 p-2" />
            </tr>
          </thead>
          <tbody>
            {data.map((schedule) => (
              <ScheduleRow
                key={schedule.id}
                schedule={schedule}
                onEdit={onEdit}
                deleteMutation={deleteMutation}
                toggleMutation={toggleMutation}
                formatLastRun={formatLastRun}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row component (handles its own AlertDialog state for delete)
// ---------------------------------------------------------------------------

interface ScheduleRowProps {
  schedule: ScheduleListViewModel;
  onEdit: (schedule: ScheduleListViewModel) => void;
  deleteMutation: ReturnType<typeof useDeleteSchedule>;
  toggleMutation: ReturnType<typeof useToggleSchedule>;
  formatLastRun: (date: Date | null) => string;
}

function ScheduleRow({
  schedule,
  onEdit,
  deleteMutation,
  toggleMutation,
  formatLastRun,
}: ScheduleRowProps): JSX.Element {
  const { t } = useTranslation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isDeleting = deleteMutation.isPending && deleteMutation.variables === schedule.id;

  const handleEdit = useCallback(() => {
    onEdit(schedule);
  }, [onEdit, schedule]);

  const handleToggle = useCallback(() => {
    toggleMutation.mutate(schedule.id);
  }, [toggleMutation, schedule.id]);

  const handleOpenDelete = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    deleteMutation.mutate(schedule.id);
    setShowDeleteDialog(false);
  }, [deleteMutation, schedule.id]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteDialog(false);
  }, []);

  const menuItems: DropdownMenuItem[] = useMemo(
    () => [
      {
        id: 'edit',
        label: t('scrapers.schedules.table.edit'),
        onSelect: handleEdit,
      },
      {
        id: 'delete',
        label: t('scrapers.schedules.table.delete'),
        onSelect: handleOpenDelete,
        destructive: true,
      },
    ],
    [t, handleEdit, handleOpenDelete],
  );

  return (
    <>
      <tr className="h-9 border-b border-outline-variant last:border-b-0 hover:bg-surface-container-low">
        <td className="max-w-[200px] truncate p-2 text-on-surface" title={schedule.name}>
          {schedule.name}
        </td>
        <td className="p-2 text-on-surface">{schedule.store}</td>
        <td className="p-2 font-mono text-on-surface">{schedule.cron}</td>
        <td className="p-2">
          <button
            type="button"
            role="switch"
            aria-checked={schedule.enabled}
            aria-label={t('scrapers.schedules.table.toggleLabel', {
              name: schedule.name,
            })}
            onClick={handleToggle}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-void-black ${
              schedule.enabled ? 'bg-primary' : 'bg-surface-container-high'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                schedule.enabled ? 'translate-x-[18px]' : 'translate-x-[2px]'
              }`}
            />
          </button>
        </td>
        <td className="p-2 text-body-xs text-on-surface-variant">
          {formatLastRun(schedule.lastRunAt)}
        </td>
        <td className="p-2 text-on-surface-variant">{schedule.jobsCount}</td>
        <td className="p-2">
          <DropdownMenu
            triggerLabel={t('scrapers.schedules.table.actions')}
            triggerAriaLabel={t('scrapers.schedules.table.actionsFor', {
              name: schedule.name,
            })}
            items={menuItems}
          />
        </td>
      </tr>

      {showDeleteDialog && (
        <AlertDialog
          open={showDeleteDialog}
          title={t('scrapers.schedules.delete.title')}
          description={t('scrapers.schedules.delete.description')}
          confirmLabel={
            isDeleting
              ? t('scrapers.schedules.delete.deleting')
              : t('scrapers.schedules.delete.confirm')
          }
          cancelLabel={t('scrapers.schedules.delete.cancel')}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          destructive
          isLoading={isDeleting}
        />
      )}
    </>
  );
}
