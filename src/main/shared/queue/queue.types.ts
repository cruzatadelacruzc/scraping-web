export const QUEUE_BACKEND = {
  BULLMQ: 'bullmq',
  SQS: 'sqs',
  MOCK: 'mock',
} as const;

export type QueueBackendName = (typeof QUEUE_BACKEND)[keyof typeof QUEUE_BACKEND];

export const QUEUE_DEFAULT_BACKEND: QueueBackendName = QUEUE_BACKEND.BULLMQ;
