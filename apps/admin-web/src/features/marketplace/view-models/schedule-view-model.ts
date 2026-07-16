/** What the UI consumes — never raw API DTOs. */

export interface ScheduleViewModel {
  id: string;
  name: string;
  store: string;
  cron: string;
  enabled: boolean;
  jobs: Record<string, unknown>[];
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleListViewModel extends ScheduleViewModel {
  /** Number of jobs defined for this schedule */
  jobsCount: number;
}
