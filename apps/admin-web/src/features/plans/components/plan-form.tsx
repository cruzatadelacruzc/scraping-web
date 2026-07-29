import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { CodeEditor } from '@shared/ui/code-editor';
import { Loader2 } from 'lucide-react';

import { useCreatePlan } from '../hooks/useCreatePlan';
import { useGetPlan } from '../hooks/useGetPlan';
import { useUpdatePlan } from '../hooks/useUpdatePlan';
import type { PlanFormValues } from '../schemas/plan-schemas';
import { planFormSchema } from '../schemas/plan-schemas';
import type { PlanListViewModel } from '../view-models/plan-view-model';

import { ALL_CONDITIONS, ConditionMultiSelect } from './condition-multi-select';

export type PlanFormMode = 'create' | 'edit' | 'duplicate';

interface PlanFormProps {
  mode: PlanFormMode;
  /** Required when mode is 'edit' */
  planId?: string | null;
  /** Required when mode is 'duplicate' — pre-fills the form from this plan */
  sourcePlan?: PlanListViewModel | null;
  /** Called after successful save */
  onSuccess: () => void;
  /** Called when cancel/back is clicked */
  onCancel: () => void;
}

const CHANNELS = ['in-app', 'email', 'telegram', 'whatsapp'] as const;

const DEFAULT_FEATURES = {
  maxAlarms: 3,
  allowedConditions: [] as string[],
  aiAlarms: false,
  notificationChannels: ['in-app'],
};

/**
 * Pure form component for creating, editing, or duplicating a plan.
 *
 * Two feature-editing modes:
 *   - **Visual** (default): structured form fields for each feature property.
 *   - **JSON**: raw CodeEditor with JSON syntax highlighting.
 */
export function PlanForm({
  mode,
  planId,
  sourcePlan,
  onSuccess,
  onCancel,
}: PlanFormProps): JSX.Element {
  const { t } = useTranslation();

  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const { data: existingPlan, isLoading: isLoadingPlan } = useGetPlan(
    mode === 'edit' ? (planId ?? null) : null,
  );

  const [editorMode, setEditorMode] = useState<'visual' | 'json'>('visual');
  const [featuresJson, setFeaturesJson] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [unlimited, setUnlimited] = useState(false);

  const isPending = createPlan.isPending || updatePlan.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      features: DEFAULT_FEATURES,
    },
  });

  // Reset form when mode is create
  useEffect(() => {
    if (mode === 'create') {
      reset({
        name: '',
        description: '',
        price: 0,
        features: { ...DEFAULT_FEATURES },
      });
      setEditorMode('visual');
      setJsonError(null);
      setUnlimited(false);
    }
  }, [mode, reset]);

  // Pre-fill form when editing an existing plan
  useEffect(() => {
    if (mode === 'edit' && existingPlan) {
      reset({
        name: existingPlan.name,
        description: existingPlan.description,
        price: existingPlan.price,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime safety: backend may omit features
        features: existingPlan.features ?? {
          maxAlarms: 0,
          allowedConditions: [],
          aiAlarms: false,
          notificationChannels: [],
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime safety: backend may omit features
      setUnlimited((existingPlan.features?.maxAlarms ?? 0) === -1);
      setEditorMode('visual');
      setJsonError(null);
    }
  }, [mode, existingPlan, reset]);

  // Pre-fill form when duplicating
  useEffect(() => {
    if (mode === 'duplicate' && sourcePlan) {
      reset({
        name: '',
        description: sourcePlan.description,
        price: sourcePlan.price,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime safety: backend may omit features
        features: sourcePlan.features ?? {
          maxAlarms: 0,
          allowedConditions: [],
          aiAlarms: false,
          notificationChannels: [],
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime safety: backend may omit features
      setUnlimited((sourcePlan.features?.maxAlarms ?? 0) === -1);
      setEditorMode('visual');
      setJsonError(null);
    }
  }, [mode, sourcePlan, reset]);

  // Watch current features for visual mode
  const watchedFeatures = watch('features');

  // Handlers for visual-mode controls
  const handleUnlimitedChange = useCallback(
    (checked: boolean) => {
      setUnlimited(checked);
      setValue('features.maxAlarms', checked ? -1 : 0, { shouldDirty: true });
    },
    [setValue],
  );

  const handleChannelToggle = useCallback(
    (channel: string) => {
      const current = watchedFeatures.notificationChannels;
      const updated = current.includes(channel)
        ? current.filter((c) => c !== channel)
        : [...current, channel];
      setValue('features.notificationChannels', updated, { shouldDirty: true });
    },
    [watchedFeatures, setValue],
  );

  // Editor-mode switches
  const switchToJson = useCallback(() => {
    setFeaturesJson(JSON.stringify(watchedFeatures, null, 2));
    setJsonError(null);
    setEditorMode('json');
  }, [watchedFeatures]);

  const switchToVisual = useCallback(() => {
    try {
      const parsed = JSON.parse(featuresJson) as PlanFormValues['features'];
      setValue('features', parsed, { shouldDirty: true });
      setUnlimited(parsed.maxAlarms === -1);
      setJsonError(null);
      setEditorMode('visual');
    } catch {
      setJsonError(t('plans.form.editor.jsonError'));
    }
  }, [featuresJson, setValue, t]);

  // Submit handler
  const onSubmit = useCallback(
    (data: PlanFormValues) => {
      if (mode === 'create' || mode === 'duplicate') {
        createPlan.mutate(data, { onSuccess });
      } else if (planId) {
        updatePlan.mutate({ id: planId, data }, { onSuccess });
      }
    },
    [mode, planId, createPlan, updatePlan, onSuccess],
  );

  const handleFormSubmit = useCallback(() => {
    if (editorMode === 'json') {
      try {
        const parsed = JSON.parse(featuresJson) as PlanFormValues['features'];
        setValue('features', parsed, { shouldDirty: true });
        setJsonError(null);
      } catch {
        setJsonError(t('plans.form.editor.jsonError'));
        return;
      }
    }
    void handleSubmit(onSubmit)();
  }, [editorMode, featuresJson, setValue, handleSubmit, onSubmit, t]);

  const handleAllowedConditionsChange = useCallback(
    (selected: string[]) => {
      setValue('features.allowedConditions', selected, {
        shouldDirty: true,
      });
    },
    [setValue],
  );

  // Loading state for edit mode — shape-matched skeleton
  if (mode === 'edit' && isLoadingPlan) {
    return (
      <div className="space-y-md">
        {/* Name field skeleton */}
        <div className="space-y-xs">
          <div className="h-3 w-16 animate-pulse rounded-sm bg-surface-container-high" />
          <div className="h-9 w-full animate-pulse rounded-sm bg-surface-container-high" />
        </div>
        {/* Description field skeleton */}
        <div className="space-y-xs">
          <div className="h-3 w-20 animate-pulse rounded-sm bg-surface-container-high" />
          <div className="h-14 w-full animate-pulse rounded-sm bg-surface-container-high" />
        </div>
        {/* Price field skeleton */}
        <div className="space-y-xs">
          <div className="h-3 w-12 animate-pulse rounded-sm bg-surface-container-high" />
          <div className="h-9 w-full animate-pulse rounded-sm bg-surface-container-high" />
        </div>
        {/* Features section skeleton */}
        <div className="space-y-xs">
          <div className="h-3 w-16 animate-pulse rounded-sm bg-surface-container-high" />
          <div className="h-36 w-full animate-pulse rounded-sm bg-surface-container-high" />
        </div>
        {/* Action buttons skeleton */}
        <div className="flex justify-end gap-sm">
          <div className="h-9 w-20 animate-pulse rounded-sm bg-surface-container-high" />
          <div className="h-9 w-28 animate-pulse rounded-sm bg-surface-container-high" />
        </div>
      </div>
    );
  }

  const saveDisabled = isPending || (editorMode === 'json' && jsonError !== null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleFormSubmit();
      }}
    >
      {/* Name */}
      <div className="mt-md">
        <label htmlFor="plan-name" className="block text-label-sm text-on-surface-variant">
          {t('plans.form.name')}
        </label>
        <input
          id="plan-name"
          type="text"
          {...register('name')}
          placeholder={t('plans.form.namePlaceholder')}
          disabled={isPending}
          className={`mt-xs w-full rounded-sm border bg-surface px-sm py-xs text-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 ${
            errors.name ? 'border-danger' : 'border-outline-variant'
          }`}
        />
        {errors.name && <p className="mt-xs text-body-sm text-danger">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div className="mt-md">
        <label htmlFor="plan-description" className="block text-label-sm text-on-surface-variant">
          {t('plans.form.description')}
        </label>
        <textarea
          id="plan-description"
          {...register('description')}
          placeholder={t('plans.form.descriptionPlaceholder')}
          disabled={isPending}
          rows={2}
          className={`mt-xs w-full rounded-sm border bg-surface px-sm py-xs text-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 ${
            errors.description ? 'border-danger' : 'border-outline-variant'
          }`}
        />
        {errors.description && (
          <p className="mt-xs text-body-sm text-danger">{errors.description.message}</p>
        )}
      </div>

      {/* Price */}
      <div className="mt-md">
        <label htmlFor="plan-price" className="block text-label-sm text-on-surface-variant">
          {t('plans.form.price')}
        </label>
        <input
          id="plan-price"
          type="number"
          step="0.01"
          min="0"
          {...register('price', { valueAsNumber: true })}
          disabled={isPending}
          className={`mt-xs w-full rounded-sm border bg-surface px-sm py-xs text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 ${
            errors.price ? 'border-danger' : 'border-outline-variant'
          }`}
        />
        {errors.price && <p className="mt-xs text-body-sm text-danger">{errors.price.message}</p>}
      </div>

      {/* Features */}
      <div className="mt-md">
        <div className="flex items-center justify-between">
          <span className="text-label-sm text-on-surface-variant">
            {t('plans.form.features.label')}
          </span>
          {/* Editor mode toggle */}
          <div className="flex overflow-hidden rounded-sm border border-outline-variant">
            <button
              type="button"
              onClick={() => {
                if (editorMode === 'json') switchToVisual();
              }}
              disabled={isPending}
              className={`px-2 py-1 text-body-xs transition-colors ${
                editorMode === 'visual'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {t('plans.form.editor.visual')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (editorMode === 'visual') switchToJson();
              }}
              disabled={isPending}
              className={`px-2 py-1 text-body-xs transition-colors ${
                editorMode === 'json'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {t('plans.form.editor.json')}
            </button>
          </div>
        </div>
      </div>

      {/* Visual mode */}
      {editorMode === 'visual' && (
        <div className="mt-md space-y-md">
          {/* maxAlarms */}
          <div>
            <label className="block text-body-sm text-on-surface">
              {t('plans.form.features.maxAlarms')}
            </label>
            <div className="mt-xs flex items-center gap-sm">
              <input
                id="plan-max-alarms"
                type="number"
                min="-1"
                value={watchedFeatures.maxAlarms}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    setValue('features.maxAlarms', val, {
                      shouldDirty: true,
                    });
                    setUnlimited(val === -1);
                  }
                }}
                disabled={unlimited || isPending}
                className="w-20 rounded-sm border border-outline-variant bg-surface px-sm py-xs text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
              <label className="flex cursor-pointer items-center gap-xs text-body-sm text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={unlimited}
                  onChange={(e) => {
                    handleUnlimitedChange(e.target.checked);
                  }}
                  disabled={isPending}
                  className="rounded-sm border-outline-variant text-primary focus:ring-2 focus:ring-primary"
                />
                {t('plans.form.features.unlimited')}
              </label>
            </div>
          </div>

          {/* allowedConditions — replaced with ConditionMultiSelect */}
          <div>
            <label className="block text-body-sm text-on-surface">
              {t('plans.form.features.allowedConditions')}
            </label>
            <div className="mt-xs">
              <ConditionMultiSelect
                options={ALL_CONDITIONS}
                value={watchedFeatures.allowedConditions}
                onChange={handleAllowedConditionsChange}
                disabled={isPending}
                placeholder={t('plans.form.features.allowedConditions')}
              />
            </div>
          </div>

          {/* aiAlarms */}
          <div className="flex items-center gap-sm">
            <label className="cursor-pointer text-body-sm text-on-surface" htmlFor="plan-ai-alarms">
              {t('plans.form.features.aiAlarms')}
            </label>
            <input
              id="plan-ai-alarms"
              type="checkbox"
              checked={watchedFeatures.aiAlarms}
              onChange={(e) => {
                setValue('features.aiAlarms', e.target.checked, {
                  shouldDirty: true,
                });
              }}
              disabled={isPending}
              className="rounded-sm border-outline-variant text-primary focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* notificationChannels */}
          <div>
            <label className="block text-body-sm text-on-surface">
              {t('plans.form.features.notificationChannels')}
            </label>
            <div className="mt-xs grid grid-cols-2 gap-x-md gap-y-xs">
              {CHANNELS.map((channel) => (
                <label
                  key={channel}
                  className="flex cursor-pointer items-center gap-xs text-body-sm text-on-surface-variant"
                >
                  <input
                    type="checkbox"
                    checked={watchedFeatures.notificationChannels.includes(channel)}
                    onChange={() => {
                      handleChannelToggle(channel);
                    }}
                    disabled={isPending}
                    className="rounded-sm border-outline-variant text-primary focus:ring-2 focus:ring-primary"
                  />
                  {channel}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* JSON mode */}
      {editorMode === 'json' && (
        <div className="mt-md">
          <CodeEditor
            preset="json"
            value={featuresJson}
            onChange={setFeaturesJson}
            height="300px"
          />
          {jsonError && <p className="mt-sm text-body-sm text-danger">{jsonError}</p>}
        </div>
      )}

      {/* Features-level error */}
      {errors.features && (
        <p className="mt-sm text-body-sm text-danger">
          {typeof errors.features.message === 'string'
            ? errors.features.message
            : 'Invalid features configuration'}
        </p>
      )}

      {/* Actions */}
      <div className="mt-lg flex justify-end gap-sm">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-sm border border-outline-variant px-sm py-xs text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-50"
        >
          {t('common.close')}
        </button>
        <button
          type="submit"
          disabled={saveDisabled}
          className="inline-flex items-center gap-xs rounded-sm bg-primary px-sm py-xs text-body-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending
            ? t('common.loading')
            : mode === 'edit'
              ? t('plans.edit.title')
              : t('plans.create.title')}
        </button>
      </div>
    </form>
  );
}
