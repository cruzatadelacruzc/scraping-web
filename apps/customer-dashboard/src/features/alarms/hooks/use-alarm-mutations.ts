import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { normalizeError } from '@/shared/api/errors';
import type { AlarmViewModel, CreateAlarmInput, UpdateAlarmInput } from '../types';
import { alarmsService } from '../services/alarms-service';
import { alarmKeys } from './query-keys';

function usePlanAwareErrorToast() {
  const { t } = useTranslation('alarms');
  return (error: unknown) => {
    const apiError = normalizeError(error);
    // Backend plan errors are 403 message-only — map by status, not code.
    if (apiError.status === 403) {
      toast.error(t('plan.limitReached'), { description: t('plan.upgradeHint') });
    } else {
      toast.error(apiError.message);
    }
  };
}

export function useCreateAlarm() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('alarms');
  const onPlanError = usePlanAwareErrorToast();
  return useMutation({
    mutationFn: (input: CreateAlarmInput) => alarmsService.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: alarmKeys.all });
      toast.success(t('toasts.created'));
    },
    onError: onPlanError,
  });
}

export function useUpdateAlarm() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('alarms');
  const onPlanError = usePlanAwareErrorToast();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAlarmInput }) =>
      alarmsService.update(id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: alarmKeys.list() });
      void queryClient.invalidateQueries({ queryKey: alarmKeys.detail(id) });
      toast.success(t('toasts.updated'));
    },
    onError: onPlanError,
  });
}

export function useDeleteAlarm() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('alarms');
  return useMutation({
    mutationFn: (id: string) => alarmsService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: alarmKeys.all });
      toast.success(t('toasts.deleted'));
    },
    onError: (error) => toast.error(normalizeError(error).message),
  });
}

/** Optimistic enabled/disabled toggle with rollback. */
export function useToggleAlarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      alarmsService.update(id, { enabled }),
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: alarmKeys.list() });
      const previous = queryClient.getQueryData<AlarmViewModel[]>(alarmKeys.list());
      queryClient.setQueryData<AlarmViewModel[]>(alarmKeys.list(), (old) =>
        old?.map((a) => (a.id === id ? { ...a, enabled } : a))
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(alarmKeys.list(), context.previous);
      toast.error(normalizeError(error).message);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: alarmKeys.list() });
    },
  });
}
