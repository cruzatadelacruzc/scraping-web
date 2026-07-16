import { useCallback } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';

import type { ScheduleFormValues } from '../../schemas/schedule-schemas';
import { CRON_PRESETS, scheduleFormSchema } from '../../schemas/schedule-schemas';
import type { FieldSchemaViewModel, StoreViewModel } from '../../view-models/store-view-model';

interface ScheduleFormProps {
  /** Available stores (from useGetStores) */
  stores: StoreViewModel[];
  /** Current values for editing; omitted for creation */
  defaultValues?: Partial<ScheduleFormValues>;
  /** Called with form data on submit */
  onSubmit: (data: ScheduleFormValues) => void;
  /** Whether the form is submitting */
  isSubmitting?: boolean;
  /** Cancel/close handler */
  onCancel: () => void;
  /** Submit button label */
  submitLabel: string;
}

/**
 * Dynamic schedule form used for both create and edit.
 *
 * - Store selection drives the job schema fields rendered.
 * - Jobs are dynamic rows: min 1, add/remove supported.
 * - Cron has preset shortcuts and inline validation.
 */
export function ScheduleForm({
  stores,
  defaultValues,
  onSubmit,
  isSubmitting = false,
  onCancel,
  submitLabel,
}: ScheduleFormProps): JSX.Element {
  const { t } = useTranslation();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      name: '',
      store: '',
      cron: '',
      enabled: true,
      jobs: [{}],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'jobs',
  });

  const selectedStoreKey = watch('store');
  const selectedStore = stores.find((s) => s.key === selectedStoreKey);

  const onFormSubmit = useCallback(
    (data: ScheduleFormValues) => {
      onSubmit(data);
    },
    [onSubmit],
  );

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onFormSubmit)(e);
      }}
      className="space-y-4"
    >
      {/* Name */}
      <div>
        <label htmlFor="schedule-name" className="block text-body-sm font-medium text-on-surface">
          {t('scrapers.schedules.form.name')}
        </label>
        <input
          id="schedule-name"
          type="text"
          {...register('name')}
          className={`mt-1 w-full rounded-sm border bg-surface px-3 py-1.5 text-body-sm text-on-surface placeholder:text-on-surface-variant focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-void-black ${
            errors.name ? 'border-danger' : 'border-outline-variant'
          }`}
          placeholder={t('scrapers.schedules.form.namePlaceholder')}
        />
        {errors.name && <p className="mt-0.5 text-body-xs text-danger">{errors.name.message}</p>}
      </div>

      {/* Store */}
      <div>
        <label htmlFor="schedule-store" className="block text-body-sm font-medium text-on-surface">
          {t('scrapers.schedules.form.store')}
        </label>
        <select
          id="schedule-store"
          {...register('store')}
          className={`mt-1 w-full rounded-sm border bg-surface px-3 py-1.5 text-body-sm text-on-surface focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-void-black ${
            errors.store ? 'border-danger' : 'border-outline-variant'
          }`}
        >
          <option value="">{t('scrapers.schedules.form.storePlaceholder')}</option>
          {stores.map((store) => (
            <option key={store.key} value={store.key}>
              {store.displayName}
            </option>
          ))}
        </select>
        {errors.store && <p className="mt-0.5 text-body-xs text-danger">{errors.store.message}</p>}
      </div>

      {/* Cron expression */}
      <div>
        <label htmlFor="schedule-cron" className="block text-body-sm font-medium text-on-surface">
          {t('scrapers.schedules.form.cron')}
        </label>
        <input
          id="schedule-cron"
          type="text"
          {...register('cron')}
          className={`mt-1 w-full rounded-sm border bg-surface px-3 py-1.5 font-mono text-body-sm text-on-surface placeholder:text-on-surface-variant focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-void-black ${
            errors.cron ? 'border-danger' : 'border-outline-variant'
          }`}
          placeholder="0 0 * * *"
        />
        {errors.cron && <p className="mt-0.5 text-body-xs text-danger">{errors.cron.message}</p>}
        <p className="mt-0.5 text-body-xs text-on-surface-variant">
          {t('scrapers.schedules.form.cronHelp')}
        </p>

        {/* Cron presets */}
        <div className="mt-1 flex flex-wrap gap-1">
          {CRON_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => {
                const input = document.getElementById('schedule-cron') as HTMLInputElement | null;
                if (input) {
                  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype,
                    'value',
                  )?.set;
                  nativeInputValueSetter?.call(input, preset.value);
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }}
              className="rounded-sm border border-outline-variant px-2 py-0.5 text-body-xs text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Enabled */}
      <div className="flex items-center gap-2">
        <input
          id="schedule-enabled"
          type="checkbox"
          {...register('enabled')}
          className="rounded-sm border-outline-variant text-primary focus-visible:ring-2 focus-visible:ring-primary"
        />
        <label htmlFor="schedule-enabled" className="text-body-sm text-on-surface">
          {t('scrapers.schedules.form.enabled')}
        </label>
      </div>

      {/* Jobs — dynamic rows */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-body-sm font-medium text-on-surface">
            {t('scrapers.schedules.form.jobs')}
          </span>
          <button
            type="button"
            onClick={() => {
              append({});
            }}
            className="flex items-center gap-1 rounded-sm px-2 py-1 text-body-xs text-primary transition-colors hover:bg-primary-muted"
            aria-label={t('scrapers.schedules.form.addJob')}
          >
            <Plus size={14} aria-hidden="true" />
            {t('scrapers.schedules.form.addJob')}
          </button>
        </div>

        {errors.jobs?.message && (
          <p className="mt-0.5 text-body-xs text-danger">{errors.jobs.message}</p>
        )}

        <div className="mt-2 space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-sm border border-outline-variant bg-surface-container-low p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-body-xs font-medium text-on-surface-variant">
                  {t('scrapers.schedules.form.jobNumber', { number: String(index + 1) })}
                </span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      remove(index);
                    }}
                    className="rounded-sm p-1 text-danger transition-colors hover:bg-danger-muted"
                    aria-label={t('scrapers.schedules.form.removeJob')}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="mt-2 space-y-2">
                {selectedStore ? (
                  selectedStore.jobSchema.fields.map((schemaField: FieldSchemaViewModel) => (
                    <div key={schemaField.name}>
                      <label className="block text-body-xs text-on-surface-variant">
                        {schemaField.label}
                        {schemaField.required && <span className="ml-1 text-danger">*</span>}
                      </label>
                      {schemaField.type === 'boolean' ? (
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="checkbox"
                            {...register(
                              // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                              `jobs.${index}.${schemaField.name}`,
                            )}
                            className="rounded-sm border-outline-variant text-primary focus-visible:ring-2 focus-visible:ring-primary"
                          />
                          <span className="text-body-xs text-on-surface-variant">
                            {schemaField.label}
                          </span>
                        </div>
                      ) : schemaField.type === 'number' ? (
                        <input
                          type="number"
                          {...register(
                            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                            `jobs.${index}.${schemaField.name}`,
                            { valueAsNumber: true },
                          )}
                          placeholder={schemaField.placeholder}
                          className="mt-1 w-full rounded-sm border border-outline-variant bg-surface px-2 py-1 text-body-sm text-on-surface placeholder:text-on-surface-variant focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-void-black"
                        />
                      ) : (
                        <input
                          type="text"
                          {...register(
                            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                            `jobs.${index}.${schemaField.name}`,
                          )}
                          placeholder={schemaField.placeholder}
                          className="mt-1 w-full rounded-sm border border-outline-variant bg-surface px-2 py-1 text-body-sm text-on-surface placeholder:text-on-surface-variant focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-void-black"
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-body-xs text-on-surface-variant">
                    {t('scrapers.schedules.form.selectStoreFirst')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-sm px-3 py-1.5 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-50"
        >
          {t('scrapers.schedules.form.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-sm bg-primary px-3 py-1.5 text-body-sm text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {isSubmitting ? t('scrapers.schedules.form.submitting') : submitLabel}
        </button>
      </div>
    </form>
  );
}
