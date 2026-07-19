import { apiClient } from '@shared/api/client';

/** Raw per-queue stats from GET /admin/queues/stats. */
export interface QueueStatsDTO {
  queueName: string;
  counts: Record<string, number>;
}

/** Response envelope for GET /admin/queues/stats. */
export interface QueueListResponseDTO {
  queues: QueueStatsDTO[];
}

/** Raw job shape (BullMQ Job.toJSON()) surfaced by the backend. */
export interface QueueJobDTO {
  id: string;
  name: string;
  data?: unknown;
  progress?: number | Record<string, unknown>;
  attemptsMade?: number;
  failedReason?: string;
  timestamp?: number;
  processedOn?: number | null;
  finishedOn?: number | null;
  returnValue?: unknown;
  status?: string;
}

/** Response envelope for GET /admin/queues/:name/jobs. */
export interface JobListResponseDTO {
  jobs: QueueJobDTO[];
}

export const queuesService = {
  /** Job counts for every registered queue. */
  listStats(opts?: { signal?: AbortSignal }) {
    return apiClient.get<QueueListResponseDTO>('/admin/queues/stats', { signal: opts?.signal });
  },

  /** Recent jobs for a queue, optionally filtered by status. */
  listJobs(name: string, opts?: { limit?: number; status?: string; signal?: AbortSignal }) {
    return apiClient.get<JobListResponseDTO>(`/admin/queues/${encodeURIComponent(name)}/jobs`, {
      params: { limit: opts?.limit, status: opts?.status },
      signal: opts?.signal,
    });
  },

  /** Full detail for a single job. */
  getJob(name: string, id: string, opts?: { signal?: AbortSignal }) {
    return apiClient.get<QueueJobDTO>(
      `/admin/queues/${encodeURIComponent(name)}/jobs/${encodeURIComponent(id)}`,
      { signal: opts?.signal },
    );
  },
};
