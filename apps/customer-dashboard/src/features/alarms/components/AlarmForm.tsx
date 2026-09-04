import { Controller, useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormInputField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSelectField,
  Input,
} from '@/shared/ui/forms';
import { alarmFormSchema, type AlarmFormValues } from '../schemas/alarm-schemas';
import { ALL_CONDITIONS, CONDITION_FIELD, type AlarmViewModel } from '../types';
import { usePlanLimits } from '../hooks/use-plan-limits';
import { alarmToFormValues } from './alarm-form-values';

function NumberField({
  form,
  name,
  label,
}: {
  form: UseFormReturn<AlarmFormValues>;
  name: 'threshold' | 'percentage';
  label: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            <span className="ml-1 text-destructive">*</span>
          </FormLabel>
          <FormControl>
            {/* value override after the spread is intentional: field.value starts
                undefined (this field is only required for some conditions), and an
                undefined input value would make the input start uncontrolled. */}
            <Input type="number" inputMode="decimal" {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface AlarmFormProps {
  alarm?: AlarmViewModel | null;
  onSubmit: (values: AlarmFormValues) => void;
  submitting?: boolean;
  onCancel: () => void;
}

export function AlarmForm({ alarm, onSubmit, submitting, onCancel }: AlarmFormProps) {
  const { t } = useTranslation(['alarms', 'common']);
  const isEdit = Boolean(alarm);
  const planLimits = usePlanLimits();

  const form = useForm<AlarmFormValues>({
    resolver: zodResolver(alarmFormSchema),
    mode: 'onBlur',
    defaultValues: alarmToFormValues(alarm),
  });

  const condition = form.watch('condition');
  const field = CONDITION_FIELD[condition];

  const conditionOptions = ALL_CONDITIONS.map((c) => ({
    value: c,
    label:
      planLimits.allowedConditions && !planLimits.allowedConditions.includes(c)
        ? `${t(`conditions.${c}`)} (${t('form.conditionLocked')})`
        : t(`conditions.${c}`),
  }));

  return (
    <Form form={form} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {isEdit ? (
        <div>
          <span className="text-sm font-medium text-on-surface">{t('form.productUrl')}</span>
          <p className="mt-1 truncate rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">
            {alarm?.productUrl}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">{t('form.productUrlLocked')}</p>
        </div>
      ) : (
        <FormInputField
          form={form}
          name="productUrl"
          label={t('form.productUrl')}
          type="url"
          description={t('form.productUrlHelp')}
          required
        />
      )}

      <FormInputField
        form={form}
        name="name"
        label={t('form.name')}
        placeholder={t('form.namePlaceholder')}
        required
      />

      <FormSelectField
        form={form}
        name="condition"
        label={t('form.condition')}
        options={conditionOptions}
        required
      />

      {field === 'threshold' && (
        <NumberField form={form} name="threshold" label={t('form.price')} />
      )}
      {field === 'percentage' && (
        <NumberField form={form} name="percentage" label={t('form.percentage')} />
      )}

      <Controller
        control={form.control}
        name="enabled"
        render={({ field: f }) => (
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={f.value}
              onChange={(e) => f.onChange(e.target.checked)}
              className="h-4 w-4 rounded border-outline-variant accent-success"
            />
            {t('form.enabled')}
          </label>
        )}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          {t('common:actions.cancel', { ns: 'common' })}
        </Button>
        <Button type="submit" disabled={submitting}>
          {t(isEdit ? 'form.submitEdit' : 'form.submitCreate')}
        </Button>
      </div>
    </Form>
  );
}
