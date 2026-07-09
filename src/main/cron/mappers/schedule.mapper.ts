import { ScrapingSchedule as ScheduleModel } from '@prisma/client';

/**
 * A single job entry stored in the `jobs` JSON array of a
 * {@link ScrapingSchedule}. The shape is store-specific and opaque to the
 * scheduler — it is passed through to the store's scraping queue as-is.
 */
export type IScheduleJobEntry = Record<string, unknown>;

/**
 * API response shape for a scraping schedule.
 */
export interface IScheduleResponseDTO {
  id: string;
  name: string;
  store: string;
  cron: string;
  enabled: boolean;
  jobs: IScheduleJobEntry[];
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pure mapper: {@link ScheduleModel} → {@link IScheduleResponseDTO}.
 */
export function toScheduleResponseDTO(model: ScheduleModel): IScheduleResponseDTO {
  return {
    id: model.id,
    name: model.name,
    store: model.store,
    cron: model.cron,
    enabled: model.enabled,
    jobs: model.jobs as IScheduleJobEntry[],
    lastRunAt: model.lastRunAt?.toISOString() ?? null,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  };
}
