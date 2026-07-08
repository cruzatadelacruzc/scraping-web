import { z } from 'zod';

// ---------------------------------------------------------------------------
// QueueStatsDTO — per-queue aggregated counts
// ---------------------------------------------------------------------------

export const QueueStatsSchema = z.object({
  queueName: z.string(),
  counts: z.record(z.string(), z.number()),
});

export type QueueStatsType = z.infer<typeof QueueStatsSchema>;

export class QueueStatsDTO {
  public readonly queueName: string;
  public readonly counts: Record<string, number>;

  public constructor(data: QueueStatsType) {
    this.queueName = data.queueName;
    this.counts = data.counts;
  }

  /**
   * Creates a QueueStatsDTO from a raw object, validating with Zod.
   * @param data - Raw object with queueName and job counts.
   * @returns A validated QueueStatsDTO instance.
   */
  public static from(data: unknown): QueueStatsDTO {
    const parsed = QueueStatsSchema.parse(data);
    return new QueueStatsDTO(parsed);
  }
}

// ---------------------------------------------------------------------------
// JobDetailDTO — single job detail
// ---------------------------------------------------------------------------

export const JobDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  data: z.unknown().optional(),
  progress: z.union([z.number(), z.object({}).passthrough()]).optional(),
  attemptsMade: z.number().optional(),
  failedReason: z.string().optional(),
  timestamp: z.number().optional(),
  processedOn: z.number().nullable().optional(),
  finishedOn: z.number().nullable().optional(),
  returnValue: z.unknown().optional(),
  status: z.string().optional(),
});

export type JobDetailType = z.infer<typeof JobDetailSchema>;

export class JobDetailDTO {
  public readonly id: string;
  public readonly name: string;
  public readonly data?: unknown;
  public readonly progress?: number | object;
  public readonly attemptsMade?: number;
  public readonly failedReason?: string;
  public readonly timestamp?: number;
  public readonly processedOn?: number | null;
  public readonly finishedOn?: number | null;
  public readonly returnValue?: unknown;
  public readonly status?: string;

  public constructor(data: JobDetailType) {
    this.id = data.id;
    this.name = data.name;
    this.data = data.data;
    this.progress = data.progress;
    this.attemptsMade = data.attemptsMade;
    this.failedReason = data.failedReason;
    this.timestamp = data.timestamp;
    this.processedOn = data.processedOn;
    this.finishedOn = data.finishedOn;
    this.returnValue = data.returnValue;
    this.status = data.status;
  }

  /**
   * Creates a JobDetailDTO from a raw object, validating with Zod.
   * @param data - Raw job detail object (typically from BullMQ Job.toJSON()).
   * @returns A validated JobDetailDTO instance.
   */
  public static from(data: unknown): JobDetailDTO {
    const parsed = JobDetailSchema.parse(data);
    return new JobDetailDTO(parsed);
  }
}
