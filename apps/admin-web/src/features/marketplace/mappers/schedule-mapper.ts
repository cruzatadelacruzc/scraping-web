import type { ScheduleDTO } from '../services/schedules-service';
import type { ScheduleListViewModel } from '../view-models/schedule-view-model';

/**
 * Transforms a ScheduleDTO from the API into a ScheduleListViewModel for the UI.
 * Pure function — no side effects, no API calls, no logger.
 */
export function mapScheduleDTOToViewModel(dto: ScheduleDTO): ScheduleListViewModel {
  return {
    id: dto.id,
    name: dto.name,
    store: dto.store,
    cron: dto.cron,
    enabled: dto.enabled,
    jobs: dto.jobs,
    lastRunAt: dto.lastRunAt ? new Date(dto.lastRunAt) : null,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    jobsCount: Array.isArray(dto.jobs) ? dto.jobs.length : 0,
  };
}
