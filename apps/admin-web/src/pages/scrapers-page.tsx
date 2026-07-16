import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ScheduleListViewModel } from '@features/marketplace';
import {
  ScheduleForm,
  SchedulesTable,
  StoresList,
  useCreateSchedule,
  useGetStores,
  useUpdateSchedule,
} from '@features/marketplace';
import type { ScheduleFormValues } from '@features/marketplace/schemas/schedule-schemas';

export function ScrapersPage(): JSX.Element {
  const { t } = useTranslation();
  const { data: stores } = useGetStores();

  // Schedule form dialog state
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleListViewModel | null>(null);

  const createMutation = useCreateSchedule();
  const updateMutation = useUpdateSchedule();

  const handleCreate = useCallback(() => {
    setEditingSchedule(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((schedule: ScheduleListViewModel) => {
    setEditingSchedule(schedule);
    setShowForm(true);
  }, []);

  const handleFormSubmit = useCallback(
    (data: ScheduleFormValues) => {
      if (editingSchedule) {
        updateMutation.mutate(
          { id: editingSchedule.id, data },
          {
            onSuccess: () => {
              setShowForm(false);
              setEditingSchedule(null);
            },
          },
        );
      } else {
        createMutation.mutate(data, {
          onSuccess: () => {
            setShowForm(false);
          },
        });
      }
    },
    [editingSchedule, createMutation, updateMutation],
  );

  const handleFormCancel = useCallback(() => {
    setShowForm(false);
    setEditingSchedule(null);
  }, []);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const resolvedStores = stores ?? [];

  return (
    <div>
      <h1 className="text-headline-lg text-on-surface">{t('nav.scrapers')}</h1>

      {/* Stores section */}
      <section className="mt-md" aria-labelledby="stores-section-heading">
        <h2 id="stores-section-heading" className="sr-only">
          {t('scrapers.stores.empty.title')}
        </h2>
        <StoresList />
      </section>

      {/* Schedules section */}
      <section className="mt-lg" aria-labelledby="schedules-section-heading">
        <h2 id="schedules-section-heading" className="text-title-md text-on-surface">
          {t('scrapers.schedules.title')}
        </h2>
        <div className="mt-sm">
          <SchedulesTable onEdit={handleEdit} onCreate={handleCreate} />
        </div>
      </section>

      {/* Schedule form dialog */}
      {showForm && (
        <ScheduleFormDialog
          stores={resolvedStores}
          editingSchedule={editingSchedule}
          isSubmitting={isSubmitting}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schedule form dialog wrapper
// ---------------------------------------------------------------------------

interface ScheduleFormDialogProps {
  stores: {
    key: string;
    displayName: string;
    scrapingQueue: string;
    jobSchema: {
      fields: {
        name: string;
        type: 'string' | 'number' | 'boolean';
        required: boolean;
        label: string;
        placeholder?: string;
      }[];
    };
  }[];
  editingSchedule: ScheduleListViewModel | null;
  isSubmitting: boolean;
  onSubmit: (data: ScheduleFormValues) => void;
  onCancel: () => void;
}

function ScheduleFormDialog({
  stores,
  editingSchedule,
  isSubmitting,
  onSubmit,
  onCancel,
}: ScheduleFormDialogProps): JSX.Element {
  const { t } = useTranslation();
  const title = editingSchedule
    ? t('scrapers.schedules.form.editTitle')
    : t('scrapers.schedules.form.createTitle');

  const defaultValues = editingSchedule
    ? {
        name: editingSchedule.name,
        store: editingSchedule.store,
        cron: editingSchedule.cron,
        enabled: editingSchedule.enabled,
        jobs: editingSchedule.jobs.map((j) => ({ ...j })),
      }
    : undefined;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30"
        role="presentation"
        onClick={onCancel}
        onKeyDown={onCancel}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-form-title"
        className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-outline-variant bg-surface p-lg shadow-lg"
      >
        <h2 id="schedule-form-title" className="text-lg font-semibold text-on-surface">
          {title}
        </h2>
        <div className="mt-md">
          <ScheduleForm
            stores={stores}
            defaultValues={defaultValues}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            onCancel={onCancel}
            submitLabel={
              editingSchedule
                ? t('scrapers.schedules.form.update')
                : t('scrapers.schedules.form.create')
            }
          />
        </div>
      </div>
    </>
  );
}
