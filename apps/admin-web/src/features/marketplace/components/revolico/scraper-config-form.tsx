import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertDialog } from '@shared/ui/alert-dialog';
import { Save } from 'lucide-react';

import { useCreateScraperConfig } from '../../hooks/useCreateScraperConfig';
import { useGetScraperConfig, useGetScraperConfigs } from '../../hooks/useGetScraperConfigs';
import { useUpdateScraperConfig } from '../../hooks/useUpdateScraperConfig';
import {
  type ConfigExpressionFormValues,
  configExpressionSchema,
} from '../../schemas/revolico-schemas';

/**
 * Revolico scraper config editor.
 *
 * Provides a storeKey selector (populated from existing configs) and a
 * font-mono textarea for the JSONata expression. Save triggers a confirmation
 * dialog (sensitive action — changes live scraping behavior + invalidates cache).
 * Auto-detects create (POST) vs update (PUT) based on config existence.
 */
export function ScraperConfigEditor(): JSX.Element {
  const { t } = useTranslation();

  // --- Configs list ---
  const { data: configs, isLoading, isError, error, refetch } = useGetScraperConfigs();

  // --- Selected storeKey ---
  const [selectedStoreKey, setSelectedStoreKey] = useState('');

  // --- Single config (enabled only when a storeKey is selected) ---
  const {
    data: singleConfig,
    isLoading: isSingleLoading,
    isError: isSingleError,
    error: singleError,
    refetch: singleRefetch,
  } = useGetScraperConfig(selectedStoreKey);

  // --- Mutations ---
  const createMutation = useCreateScraperConfig();
  const updateMutation = useUpdateScraperConfig();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // --- Form ---
  const currentExpression =
    singleConfig === undefined ? '' : singleConfig === null ? '' : singleConfig.expression;

  const isNewConfig = singleConfig === null && selectedStoreKey.length > 0;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ConfigExpressionFormValues>({
    resolver: zodResolver(configExpressionSchema),
    defaultValues: { expression: currentExpression },
  });

  // Sync form when the loaded config changes (e.g., user selects a different storeKey)
  useEffect(() => {
    reset({ expression: currentExpression });
  }, [currentExpression, reset]);

  const expressionValue = watch('expression');

  // --- Confirmation dialog ---
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingExpression, setPendingExpression] = useState('');

  const onSubmit = useCallback((data: ConfigExpressionFormValues) => {
    setPendingExpression(data.expression);
    setShowConfirm(true);
  }, []);

  const handleConfirmSave = useCallback(() => {
    if (isNewConfig) {
      createMutation.mutate(
        { storeKey: selectedStoreKey, expression: pendingExpression },
        {
          onSettled: () => {
            setShowConfirm(false);
          },
        },
      );
    } else {
      updateMutation.mutate(
        { storeKey: selectedStoreKey, data: { expression: pendingExpression } },
        {
          onSettled: () => {
            setShowConfirm(false);
          },
        },
      );
    }
  }, [isNewConfig, selectedStoreKey, pendingExpression, createMutation, updateMutation]);

  const handleCancelConfirm = useCallback(() => {
    setShowConfirm(false);
  }, []);

  const expressionChanged = expressionValue !== currentExpression;

  // --- 1. Loading ---
  if (isLoading) {
    return (
      <div className="space-y-sm">
        <div className="h-8 w-48 animate-pulse rounded-sm bg-surface-container-high" />
        <div className="h-32 animate-pulse rounded-sm bg-surface-container-high" />
      </div>
    );
  }

  // --- 2. Error ---
  if (isError) {
    return (
      <div className="rounded-md border border-danger bg-danger-muted p-md text-sm">
        <p className="text-danger">
          {error instanceof Error ? error.message : t('scrapers.revolico.error.loadConfigs')}
        </p>
        <button
          onClick={() => {
            void refetch();
          }}
          className="mt-sm rounded-sm bg-danger px-3 py-1 text-sm text-white transition-colors hover:bg-danger/80"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  // --- 3. Empty / no configs ---
  if (!configs || configs.length === 0) {
    return (
      <div className="py-lg text-center">
        <p className="text-body-sm text-on-surface-variant">
          {t('scrapers.revolico.config.noConfigs')}
        </p>
      </div>
    );
  }

  // --- 4. Has configs — show selector + form ---
  return (
    <div className="space-y-3">
      {/* StoreKey selector */}
      <div>
        <label
          htmlFor="config-storekey-select"
          className="block text-body-sm font-medium text-on-surface"
        >
          {t('scrapers.revolico.config.selectStoreKey')}
        </label>
        <select
          id="config-storekey-select"
          value={selectedStoreKey}
          onChange={(e) => {
            setSelectedStoreKey(e.target.value);
          }}
          className="mt-1 w-full rounded-sm border border-outline-variant bg-surface px-3 py-1.5 text-body-sm text-on-surface focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-void-black"
        >
          <option value="">{t('scrapers.revolico.config.storeKeyPlaceholder')}</option>
          {configs.map((c) => (
            <option key={c.storeKey} value={c.storeKey}>
              {c.storeKey}
            </option>
          ))}
        </select>
      </div>

      {/* Expression editor — shown when a storeKey is selected */}
      {selectedStoreKey.length > 0 && (
        <>
          {isSingleLoading ? (
            <div className="h-32 animate-pulse rounded-sm bg-surface-container-high" />
          ) : isSingleError ? (
            <div className="rounded-md border border-danger bg-danger-muted p-md text-sm">
              <p className="text-danger">
                {singleError instanceof Error
                  ? singleError.message
                  : t('scrapers.revolico.error.loadConfig')}
              </p>
              <button
                onClick={() => {
                  void singleRefetch();
                }}
                className="mt-sm rounded-sm bg-danger px-3 py-1 text-sm text-white transition-colors hover:bg-danger/80"
              >
                {t('common.retry')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Store key info */}
              <div>
                <span className="block text-body-xs text-on-surface-variant">
                  {isNewConfig
                    ? t('scrapers.revolico.config.newConfig')
                    : t('scrapers.revolico.config.editingConfig')}
                </span>
              </div>

              {/* Expression textarea */}
              <div>
                <label
                  htmlFor="config-expression"
                  className="block text-body-sm font-medium text-on-surface"
                >
                  {t('scrapers.revolico.config.expression')}
                </label>
                <textarea
                  id="config-expression"
                  {...register('expression')}
                  rows={8}
                  className={`mt-1 w-full rounded-sm border bg-surface px-3 py-2 font-mono text-body-sm text-on-surface placeholder:text-on-surface-variant focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-void-black ${
                    errors.expression ? 'border-danger' : 'border-outline-variant'
                  }`}
                  spellCheck={false}
                  placeholder="// JSONata expression..."
                />
                {errors.expression && (
                  <p className="mt-0.5 text-body-xs text-danger">{errors.expression.message}</p>
                )}
                <p className="mt-0.5 text-right text-body-xs text-on-surface-variant">
                  {expressionValue.length} chars
                </p>
              </div>

              {/* Save */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    void handleSubmit(onSubmit)();
                  }}
                  disabled={!expressionChanged || expressionValue.trim().length === 0 || isSaving}
                  className="flex items-center gap-1 rounded-sm bg-primary px-3 py-1.5 text-body-sm text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  <Save size={14} aria-hidden="true" />
                  {isSaving
                    ? t('scrapers.revolico.config.saving')
                    : isNewConfig
                      ? t('scrapers.revolico.config.create')
                      : t('scrapers.revolico.config.save')}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirmation dialog */}
      {showConfirm && (
        <AlertDialog
          open={showConfirm}
          title={t('scrapers.revolico.config.confirmTitle')}
          description={t('scrapers.revolico.config.confirmDescription')}
          confirmLabel={
            isSaving
              ? t('scrapers.revolico.config.saving')
              : t('scrapers.revolico.config.confirmSave')
          }
          cancelLabel={t('scrapers.revolico.config.cancel')}
          onConfirm={handleConfirmSave}
          onCancel={handleCancelConfirm}
          destructive={false}
          isLoading={isSaving}
        />
      )}
    </div>
  );
}
