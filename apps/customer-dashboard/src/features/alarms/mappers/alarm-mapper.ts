import type { AlarmDTO, AlarmViewModel } from '../types';

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

/** Pure DTO → ViewModel mapping (ISO strings → Date). */
export function toAlarmViewModel(dto: AlarmDTO): AlarmViewModel {
  return {
    ...dto,
    lastEvaluatedAt: toDate(dto.lastEvaluatedAt),
    lastMatchedAt: toDate(dto.lastMatchedAt),
    lastNotifiedAt: toDate(dto.lastNotifiedAt),
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}
