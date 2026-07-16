import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertDialog } from '@shared/ui/alert-dialog';
import { Play } from 'lucide-react';

import { useTriggerScrapingJob } from '../../hooks/useTriggerScrapingJob';
import { type ScrapeJobFormValues, scrapeJobSchema } from '../../schemas/revolico-schemas';

/**
 * Form to trigger an ad-hoc Revolico scraping job.
 *
 * Fields: category (required), subcategory (optional),
 * pageNumber (optional, >= 1), totalPages (optional, >= 1).
 * Submit opens a confirmation dialog before sending the POST.
 */
export function ScrapeNowForm(): JSX.Element {
  const { t } = useTranslation();
  const triggerMutation = useTriggerScrapingJob();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ScrapeJobFormValues>({
    resolver: zodResolver(scrapeJobSchema),
    defaultValues: {
      category: '',
      subcategory: '',
      pageNumber: undefined,
      totalPages: undefined,
    },
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<ScrapeJobFormValues | null>(null);

  const onSubmit = useCallback((data: ScrapeJobFormValues) => {
    setPendingData(data);
    setShowConfirm(true);
  }, []);

  const handleConfirmTrigger = useCallback(() => {
    if (!pendingData) return;
    triggerMutation.mutate(
      {
        category: pendingData.category,
        ...(pendingData.subcategory ? { subcategory: pendingData.subcategory } : {}),
        ...(pendingData.pageNumber ? { pageNumber: pendingData.pageNumber } : {}),
        ...(pendingData.totalPages ? { totalPages: pendingData.totalPages } : {}),
      },
      {
        onSettled: () => {
          setShowConfirm(false);
        },
        onSuccess: () => {
          reset();
        },
      },
    );
  }, [pendingData, triggerMutation, reset]);

  const handleCancelConfirm = useCallback(() => {
    setShowConfirm(false);
    setPendingData(null);
  }, []);

  const isTriggering = triggerMutation.isPending;

  return (
    <div>
      <form
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
        className="space-y-3"
      >
        {/* Category (required) */}
        <div>
          <label htmlFor="job-category" className="block text-body-sm font-medium text-on-surface">
            {t('scrapers.revolico.job.category')} <span className="text-danger">*</span>
          </label>
          <input
            id="job-category"
            type="text"
            {...register('category')}
            className={`mt-1 w-full rounded-sm border bg-surface px-3 py-1.5 text-body-sm text-on-surface placeholder:text-on-surface-variant focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-void-black ${
              errors.category ? 'border-danger' : 'border-outline-variant'
            }`}
            placeholder="e.g. /computadoras/"
          />
          {errors.category && (
            <p className="mt-0.5 text-body-xs text-danger">{errors.category.message}</p>
          )}
        </div>

        {/* Subcategory (optional) */}
        <div>
          <label
            htmlFor="job-subcategory"
            className="block text-body-sm font-medium text-on-surface"
          >
            {t('scrapers.revolico.job.subcategory')}
          </label>
          <input
            id="job-subcategory"
            type="text"
            {...register('subcategory')}
            className="mt-1 w-full rounded-sm border border-outline-variant bg-surface px-3 py-1.5 text-body-sm text-on-surface placeholder:text-on-surface-variant focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-void-black"
            placeholder="e.g. /computadoras/laptops/"
          />
        </div>

        {/* Page number (optional) */}
        <div>
          <label
            htmlFor="job-pageNumber"
            className="block text-body-sm font-medium text-on-surface"
          >
            {t('scrapers.revolico.job.pageNumber')}
          </label>
          <input
            id="job-pageNumber"
            type="number"
            min="1"
            step="1"
            {...register('pageNumber', { valueAsNumber: true })}
            className={`mt-1 w-full rounded-sm border bg-surface px-3 py-1.5 text-body-sm text-on-surface placeholder:text-on-surface-variant focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-void-black ${
              errors.pageNumber ? 'border-danger' : 'border-outline-variant'
            }`}
            placeholder="1"
          />
          {errors.pageNumber && (
            <p className="mt-0.5 text-body-xs text-danger">{errors.pageNumber.message}</p>
          )}
        </div>

        {/* Total pages (optional) */}
        <div>
          <label
            htmlFor="job-totalPages"
            className="block text-body-sm font-medium text-on-surface"
          >
            {t('scrapers.revolico.job.totalPages')}
          </label>
          <input
            id="job-totalPages"
            type="number"
            min="1"
            step="1"
            {...register('totalPages', { valueAsNumber: true })}
            className={`mt-1 w-full rounded-sm border bg-surface px-3 py-1.5 text-body-sm text-on-surface placeholder:text-on-surface-variant focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-void-black ${
              errors.totalPages ? 'border-danger' : 'border-outline-variant'
            }`}
            placeholder="5"
          />
          {errors.totalPages && (
            <p className="mt-0.5 text-body-xs text-danger">{errors.totalPages.message}</p>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isTriggering}
            className="flex items-center gap-1 rounded-sm bg-primary px-3 py-1.5 text-body-sm text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            <Play size={14} aria-hidden="true" />
            {isTriggering
              ? t('scrapers.revolico.job.triggering')
              : t('scrapers.revolico.job.trigger')}
          </button>
        </div>
      </form>

      {/* Confirmation dialog */}
      {showConfirm && pendingData && (
        <AlertDialog
          open={showConfirm}
          title={t('scrapers.revolico.job.confirmTitle')}
          description={t('scrapers.revolico.job.confirmDescription', {
            category: pendingData.category,
          })}
          confirmLabel={
            isTriggering
              ? t('scrapers.revolico.job.triggering')
              : t('scrapers.revolico.job.confirmTrigger')
          }
          cancelLabel={t('scrapers.revolico.job.cancel')}
          onConfirm={handleConfirmTrigger}
          onCancel={handleCancelConfirm}
          destructive={false}
          isLoading={isTriggering}
        />
      )}
    </div>
  );
}
