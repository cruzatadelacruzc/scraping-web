import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@shared/config/routes';
import { Button } from '@/shared/ui/forms';
import { Skeleton } from '@/shared/ui/skeleton';
import { useAlarm } from '../hooks/use-alarms';
import { useUpdateAlarm } from '../hooks/use-alarm-mutations';
import { AlarmForm } from '../components/AlarmForm';
import { formValuesToInput } from '../components/alarm-form-values';
import type { AlarmFormValues } from '../schemas/alarm-schemas';

/** Edit an existing alarm. Creation lives in `AlarmCreatePage` (catalog picker wizard). */
export default function AlarmFormPage() {
  const { t } = useTranslation('alarms');
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const alarmQuery = useAlarm(id);
  const update = useUpdateAlarm();

  const onSubmit = (values: AlarmFormValues) => {
    update.mutate(
      { id, input: formValuesToInput(values) },
      { onSuccess: () => navigate(ROUTES.ALARMS) }
    );
  };

  if (alarmQuery.isLoading) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (alarmQuery.isError) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 text-center">
        <p className="text-sm text-on-surface-variant">
          {t('common:states.error', { ns: 'common' })}
        </p>
        <Button variant="outline" onClick={() => alarmQuery.refetch()}>
          {t('actions.retry', { ns: 'common' })}
        </Button>
      </div>
    );
  }

  if (!alarmQuery.data) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="text-sm text-on-surface-variant">{t('detail.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-semibold text-on-surface">{t('form.editTitle')}</h1>
      <AlarmForm
        alarm={alarmQuery.data}
        onSubmit={onSubmit}
        submitting={update.isPending}
        onCancel={() => navigate(ROUTES.ALARMS)}
      />
    </div>
  );
}
