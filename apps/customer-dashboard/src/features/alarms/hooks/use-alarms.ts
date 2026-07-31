import { useQuery } from '@tanstack/react-query';
import { toAlarmViewModel } from '../mappers/alarm-mapper';
import { alarmsService } from '../services/alarms-service';
import { alarmKeys } from './query-keys';

export function useAlarms() {
  return useQuery({
    queryKey: alarmKeys.list(),
    queryFn: async ({ signal }) => (await alarmsService.list(signal)).map(toAlarmViewModel),
  });
}

export function useAlarm(id: string) {
  return useQuery({
    queryKey: alarmKeys.detail(id),
    queryFn: async ({ signal }) => toAlarmViewModel(await alarmsService.get(id, signal)),
    enabled: !!id,
  });
}
