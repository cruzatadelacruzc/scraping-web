import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@shared/config/routes';
import { Skeleton } from '@/shared/ui/skeleton';
import { useAlarm } from '../hooks/use-alarms';
import { useCreateAlarm, useUpdateAlarm } from '../hooks/use-alarm-mutations';
import { AlarmForm } from '../components/AlarmForm';
import { formValuesToInput } from '../components/alarm-form-values';
import type { AlarmFormValues } from '../schemas/alarm-schemas';

export default function AlarmFormPage() {
  const { t } = useTranslation('alarms');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const alarmQuery = useAlarm(id ?? '');
  const create = useCreateAlarm();
  const update = useUpdateAlarm();

  const submitting = create.isPending || update.isPending;

  const onSubmit = (values: AlarmFormValues) => {
    const input = formValuesToInput(values);
    if (isEdit && id) {
      update.mutate({ id, input }, { onSuccess: () => navigate(ROUTES.ALARMS) });
    } else {
      create.mutate(input, { onSuccess: () => navigate(ROUTES.ALARMS) });
    }
  };

  if (isEdit && alarmQuery.isLoading) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isEdit && !alarmQuery.data) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="text-sm text-on-surface-variant">{t('detail.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-semibold text-on-surface">
        {t(isEdit ? 'form.editTitle' : 'form.createTitle')}
      </h1>
      <AlarmForm
        alarm={isEdit ? alarmQuery.data : null}
        onSubmit={onSubmit}
        submitting={submitting}
        onCancel={() => navigate(ROUTES.ALARMS)}
      />
    </div>
  );
}
