import { useQuery } from '@tanstack/react-query';
import { createQueryPersister } from '@/shared/offline/query-persister';
import { toAlarmViewModel } from '../mappers/alarm-mapper';
import { alarmsService } from '../services/alarms-service';
import { alarmKeys } from './query-keys';

/** Shared IndexedDB persister — alarm reads survive a reload while offline. */
const persister = createQueryPersister();

export function useAlarms() {
  return useQuery({
    queryKey: alarmKeys.list(),
    queryFn: async ({ signal }) => (await alarmsService.list(signal)).map(toAlarmViewModel),
    persister,
  });
}

export function useAlarm(id: string) {
  return useQuery({
    queryKey: alarmKeys.detail(id),
    queryFn: async ({ signal }) => toAlarmViewModel(await alarmsService.get(id, signal)),
    enabled: !!id,
    persister,
  });
}
