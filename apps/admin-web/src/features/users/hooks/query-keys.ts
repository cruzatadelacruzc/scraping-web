export const userKeys = {
  all: ['users'] as const,
  list: (filters: Record<string, unknown>) => ['users', 'list', filters] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
  roles: ['users', 'roles'] as const,
};
