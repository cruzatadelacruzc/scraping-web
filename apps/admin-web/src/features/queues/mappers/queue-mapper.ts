import type { QueueJobDTO, QueueStatsDTO } from '../services/queues-service';
import type {
  BadgeVariant,
  JobDetailViewModel,
  JobListItemViewModel,
  JobStatus,
  QueueCountViewModel,
  QueueStatsViewModel,
} from '../view-models/queue-view-model';

/** Display order for known statuses — operational severity first. */
const STATUS_ORDER: readonly JobStatus[] = [
  'active',
  'waiting',
  'delayed',
  'failed',
  'completed',
  'paused',
];

const STATUS_VARIANT: Record<JobStatus, BadgeVariant> = {
  active: 'primary',
  waiting: 'info',
  delayed: 'warning',
  failed: 'danger',
  completed: 'success',
  paused: 'muted',
  unknown: 'muted',
};

function toJobStatus(raw: string): JobStatus {
  return (STATUS_ORDER as readonly string[]).includes(raw) ? (raw as JobStatus) : 'unknown';
}

function orderIndex(status: string): number {
  const index = (STATUS_ORDER as readonly string[]).indexOf(status);
  return index === -1 ? STATUS_ORDER.length : index;
}

function safeJsonStringify(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const seen = new WeakSet();
  try {
    return JSON.stringify(
      value,
      (_key: string, val: unknown) => {
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) return '[Circular]';
          seen.add(val);
        }
        return val;
      },
      2,
    );
  } catch {
    return null;
  }
}

/**
 * Transforms a backend QueueStatsDTO into a UI-oriented QueueStatsViewModel.
 * Pure function — no side effects, no API calls.
 */
export function mapQueueStatsDTOToViewModel(dto: QueueStatsDTO): QueueStatsViewModel {
  const counts: QueueCountViewModel[] = Object.entries(dto.counts)
    .sort(([a], [b]) => orderIndex(a) - orderIndex(b) || a.localeCompare(b))
    .map(([label, count]) => ({ label, count, variant: STATUS_VARIANT[toJobStatus(label)] }));

  const total = Object.values(dto.counts).reduce((sum, n) => sum + n, 0);
  const failedCount = dto.counts.failed || 0;

  return { name: dto.queueName, counts, total, failedCount, hasFailures: failedCount > 0 };
}

/**
 * Transforms a backend QueueJobDTO into a table row ViewModel.
 * Pure function — no side effects, no API calls.
 */
export function mapJobDTOToListItem(dto: QueueJobDTO): JobListItemViewModel {
  const status = toJobStatus(dto.status ?? 'unknown');
  const finishedAt = typeof dto.finishedOn === 'number' ? new Date(dto.finishedOn) : null;
  const processedAtMs = typeof dto.processedOn === 'number' ? dto.processedOn : null;

  return {
    id: dto.id,
    name: dto.name,
    status,
    statusVariant: STATUS_VARIANT[status],
    attemptsMade: dto.attemptsMade ?? 0,
    createdAt: typeof dto.timestamp === 'number' ? new Date(dto.timestamp) : null,
    finishedAt,
    durationMs:
      finishedAt !== null && processedAtMs !== null ? finishedAt.getTime() - processedAtMs : null,
    failedReason: dto.failedReason ?? null,
  };
}

/**
 * Transforms a backend QueueJobDTO into the full drawer ViewModel.
 * Pure function — no side effects, no API calls.
 */
export function mapJobDTOToDetail(dto: QueueJobDTO): JobDetailViewModel {
  return {
    ...mapJobDTOToListItem(dto),
    payloadJson: safeJsonStringify(dto.data),
    returnValueJson: safeJsonStringify(dto.returnValue),
    progressPercent: typeof dto.progress === 'number' ? dto.progress : null,
    processedAt: typeof dto.processedOn === 'number' ? new Date(dto.processedOn) : null,
  };
}
