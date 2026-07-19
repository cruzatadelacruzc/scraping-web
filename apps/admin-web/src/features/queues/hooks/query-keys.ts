export const queueKeys = {
  all: ['queues'] as const,
  stats: () => ['queues', 'stats'] as const,
  jobs: (name: string, filters: Record<string, unknown>) =>
    ['queues', name, 'jobs', filters] as const,
  job: (name: string, id: string) => ['queues', name, 'job', id] as const,
};
