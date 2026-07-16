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
import { Dialog } from '@shared/ui/dialog';

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

  const defaultValues = editingSchedule
    ? {
        name: editingSchedule.name,
        store: editingSchedule.store,
        cron: editingSchedule.cron,
        enabled: editingSchedule.enabled,
        jobs: editingSchedule.jobs.map((j) => ({ ...j })),
      }
    : undefined;

  const formTitle = editingSchedule
    ? t('scrapers.schedules.form.editTitle')
    : t('scrapers.schedules.form.createTitle');

  const submitLabel = editingSchedule
    ? t('scrapers.schedules.form.update')
    : t('scrapers.schedules.form.create');

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
      <Dialog open={showForm} title={formTitle} onClose={handleFormCancel}>
        <ScheduleForm
          stores={resolvedStores}
          defaultValues={defaultValues}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
          onCancel={handleFormCancel}
          submitLabel={submitLabel}
        />
      </Dialog>
    </div>
  );
}
