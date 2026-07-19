/** Known BullMQ job states surfaced by the backend. */
export type JobStatus =
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused'
  | 'unknown';

/** Semantic color variant for count/status chips. */
export type BadgeVariant = 'primary' | 'info' | 'success' | 'danger' | 'warning' | 'muted';

export interface QueueCountViewModel {
  /** Raw status label as reported by the backend (e.g. "waiting"). */
  label: string;
  count: number;
  variant: BadgeVariant;
}

export interface QueueStatsViewModel {
  name: string;
  /** Counts ordered by operational severity (active first, paused last). */
  counts: QueueCountViewModel[];
  total: number;
  failedCount: number;
  hasFailures: boolean;
}

export interface JobListItemViewModel {
  id: string;
  name: string;
  status: JobStatus;
  statusVariant: BadgeVariant;
  attemptsMade: number;
  createdAt: Date | null;
  finishedAt: Date | null;
  /** Milliseconds between processedOn and finishedOn; null when not finished. */
  durationMs: number | null;
  failedReason: string | null;
}

export interface JobDetailViewModel extends JobListItemViewModel {
  /** Pretty-printed JSON payload; null when the job carries no data. */
  payloadJson: string | null;
  /** Pretty-printed JSON return value; null when absent. */
  returnValueJson: string | null;
  /** Numeric progress 0-100; null when absent or structured. */
  progressPercent: number | null;
  processedAt: Date | null;
}
