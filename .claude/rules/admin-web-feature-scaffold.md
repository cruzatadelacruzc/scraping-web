# Admin Web — Feature Scaffold Procedure

Step-by-step recipe for adding a new feature module under `apps/admin-web/src/features/<module>/`. Follow these steps **in order**. Each step builds on the previous one.

Conventions enforced here come from `apps/admin-web/CLAUDE.md`, `DESIGN.md`, and `.claude/rules/admin-web-ui.md`. Read those first.

---

## Example: Accounts Feature

The examples below use a fictional `accounts` feature (CRUD list + drawer detail) so you can see the exact shape of every file. Replace `accounts` with your module name and adjust types accordingly.

### Step 0: Define API contract

Before writing any code, identify which endpoints this feature consumes. For accounts:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/admin/accounts` | `GET` | List with pagination/filters |
| `/api/admin/accounts/:id` | `GET` | Single account detail |
| `/api/admin/accounts/:id` | `PUT` | Update account |
| `/api/admin/accounts/:id` | `DELETE` | Delete account |

---

### Step 1: Create folder structure

```
features/accounts/
├── components/
│   ├── accounts-table.tsx
│   ├── accounts-filters.tsx
│   └── account-detail-drawer.tsx
├── hooks/
│   ├── query-keys.ts
│   ├── useGetAccounts.ts
│   ├── useGetAccount.ts
│   ├── useUpdateAccount.ts
│   └── useDeleteAccount.ts
├── services/
│   └── accounts-service.ts
├── mappers/
│   └── account-mapper.ts
├── schemas/
│   └── account-schemas.ts
├── view-models/
│   └── account-view-model.ts
└── index.ts
```

Only create subfolders that will contain files. If a feature has no forms (e.g., a read-only dashboard widget), skip `schemas/`.

---

### Step 2: Define ViewModels

**File**: `features/accounts/view-models/account-view-model.ts`

```typescript
// What the UI consumes. Never raw API DTOs.
export interface AccountViewModel {
  id: string;
  name: string;
  status: AccountStatus;
  userCount: number;
  planName: string;
  createdAt: Date; // Parsed from ISO string
}

export enum AccountStatus {
  Active = 'active',
  Suspended = 'suspended',
  Deleted = 'deleted',
}

// What the table/drawer needs as a flat list item
export interface AccountListViewModel extends AccountViewModel {
  // Additional computed fields for list rendering
  statusBadge: { label: string; variant: 'success' | 'danger' | 'warning' };
}
```

**Rules**:
- ViewModels are UI-oriented. They can include derived fields, formatted dates, badge configs.
- Enums and union types preferred over raw strings.
- Dates are `Date` objects, not ISO strings — the mapper parses them.
- No API concerns leak in (no `accountId`, no `created_at` snake_case).

---

### Step 3: Create API service

**File**: `features/accounts/services/accounts-service.ts`

```typescript
import { apiClient } from '@/shared/api/api-client';
import type { AccountDTO, AccountListResponseDTO } from './types'; // local, not from swagger

// Raw HTTP calls. No transformation, no error handling beyond the interceptor.
export const accountsService = {
  list(params: { page: number; limit: number; search?: string; status?: string }) {
    return apiClient.get<AccountListResponseDTO>('/api/admin/accounts', { params, signal: params.signal });
  },

  getById(id: string) {
    return apiClient.get<AccountDTO>(`/api/admin/accounts/${id}`);
  },

  update(id: string, data: UpdateAccountDTO) {
    return apiClient.put<AccountDTO>(`/api/admin/accounts/${id}`, data);
  },

  delete(id: string) {
    return apiClient.delete(`/api/admin/accounts/${id}`);
  },
};
```

**Rules**:
- `DTO` types are file-local or in a sibling `types.ts`. Never import from `src/main/` or `swagger.json`.
- `signal` is passed through to `apiClient` for cancelability.
- The service returns the axios response — the hook unwraps `.data`.
- One file per resource. If a module has 3 resources (e.g., accounts, subscriptions, plans), that's 3 service files.

---

### Step 4: Create mappers

**File**: `features/accounts/mappers/account-mapper.ts`

```typescript
import type { AccountDTO } from '../services/types';
import { AccountViewModel, AccountStatus } from '../view-models/account-view-model';

// Pure function. No side effects. No API calls. No logger.
export function mapAccountDTOToViewModel(dto: AccountDTO): AccountViewModel {
  return {
    id: dto.id,
    name: dto.name,
    status: dto.deletedAt
      ? AccountStatus.Deleted
      : dto.suspendedAt
        ? AccountStatus.Suspended
        : AccountStatus.Active,
    userCount: dto._count?.users ?? 0,
    planName: dto.subscription?.plan?.name ?? 'No plan',
    createdAt: new Date(dto.createdAt),
  };
}
```

**Rules**:
- Pure functions only. They receive a DTO, return a ViewModel.
- Date strings are parsed to `Date` here.
- Derived fields (status badge configs, display names) are computed here, not in the component.
- No `try/catch` — if the DTO is malformed, let it throw so the error boundary catches it.
- If the transformation is trivial (1:1 field mapping), the mapper can be a one-liner. Still keep it in `mappers/`.

---

### Step 5: Define query key factory

**File**: `features/accounts/hooks/query-keys.ts`

```typescript
export const accountKeys = {
  all: ['accounts'] as const,
  list: (filters: Record<string, unknown>) => ['accounts', 'list', filters] as const,
  detail: (id: string) => ['accounts', 'detail', id] as const,
};
```

**Rules**:
- Structured keys enable granular cache invalidation.
- `as const` ensures TypeScript infers the literal tuple type.
- Filters object is spread into the key — changing filters auto-triggers a refetch.
- Keep the factory in `hooks/` — it's part of the query layer, not the service layer.

---

### Step 6: Create hooks

**File**: `features/accounts/hooks/useGetAccounts.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { accountsService } from '../services/accounts-service';
import { mapAccountDTOToViewModel } from '../mappers/account-mapper';
import { accountKeys } from './query-keys';
import type { AccountListViewModel } from '../view-models/account-view-model';

interface UseGetAccountsParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}

export function useGetAccounts(params: UseGetAccountsParams) {
  return useQuery({
    queryKey: accountKeys.list(params),
    queryFn: async ({ signal }) => {
      const response = await accountsService.list({ ...params, signal });
      return {
        items: response.data.items.map(mapAccountDTOToViewModel),
        total: response.data.total,
      };
    },
    staleTime: 5 * 60 * 1000, // standard tier
    placeholderData: (prev) => prev, // keep previous data while refetching
  });
}
```

**File**: `features/accounts/hooks/useUpdateAccount.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { accountsService } from '../services/accounts-service';
import { accountKeys } from './query-keys';

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAccountDTO }) =>
      accountsService.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.list({}) });
      queryClient.invalidateQueries({ queryKey: accountKeys.detail(variables.id) });
      toast.success('Account updated');
    },
    onError: (error: ApiError) => {
      toast.error(error.message, { action: { label: 'Retry', onClick: () => {} } });
    },
  });
}
```

**File**: `features/accounts/hooks/useDeleteAccount.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { accountsService } from '../services/accounts-service';
import { accountKeys } from './query-keys';

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => accountsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      toast.success('Account permanently deleted');
    },
    onError: (error: ApiError) => {
      toast.error(error.message, { action: { label: 'Retry', onClick: () => {} } });
    },
  });
}
```

**Rules**:
- `useGet<Resource>` — one per list query. Returns `{ items, total }` or just the ViewModel for detail.
- `useCreate<Resource>`, `useUpdate<Resource>`, `useDelete<Resource>` — one per mutation.
- Hooks are the ONLY place `useQuery` / `useMutation` are called. Components import hooks, never `@tanstack/react-query`.
- `staleTime` matches the tier defined in `CLAUDE.md` (standard = 5 min for accounts/users/products).
- `placeholderData: (prev) => prev` prevents layout shift on refetch.
- Toast on success (4s) and error (sticky with Retry). 401/403 are handled by the API client interceptor — do NOT toast them here.
- Mutation keys follow the invalidation rules: create → invalidate list, update → invalidate list + detail, delete → invalidate all.

---

### Step 7: Build components

**File**: `features/accounts/components/accounts-table.tsx`

```typescript
import { useGetAccounts } from '../hooks/useGetAccounts';
import { useDeleteAccount } from '../hooks/useDeleteAccount';
import { TableSkeleton } from '@/shared/ui/skeletons/table-skeleton';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { DataTable } from '@/shared/ui/data-table'; // shadcn/ui + TanStack Table wrapper
import { columns } from './accounts-columns'; // column definitions in sibling file

export function AccountsTable() {
  const { data, isLoading, isError, error, refetch, isFetching } = useGetAccounts({
    page: 1,
    limit: 20,
  });
  const deleteMutation = useDeleteAccount();

  // 1. Initial load — shape-matched skeleton
  if (isLoading) {
    return <TableSkeleton rows={20} cols={6} />;
  }

  // 2. Error — per-component error boundary
  if (isError) {
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  }

  // 3. Empty — centered icon + message
  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        icon="Building2"
        title="No accounts yet"
        description="Accounts will appear here once tenants sign up."
      />
    );
  }

  // 4. Data — the happy path
  return (
    <div>
      {isFetching && <div className="h-0.5 bg-primary/20 animate-pulse" />}
      <DataTable
        columns={columns}
        data={data.items}
        total={data.total}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </div>
  );
}
```

**Rules**:
- Every data component handles **four states in this exact order**: loading → error → empty → data.
- Loading = skeleton that matches the final layout geometry. Never a spinner.
- Error = `ErrorState` component with message + Retry button.
- Empty = `EmptyState` component with icon, title, description, optional CTA.
- Data = normal render. `isFetching` shows a 2px progress bar; existing data is NOT cleared.
- Mutations are wired in the component but defined in hooks.
- Column definitions are extracted to a sibling file (`accounts-columns.tsx`) to keep the table component focused.

---

### Step 8: Add route

**File**: `App.tsx` (or routes config)

```typescript
const AccountsPage = React.lazy(() =>
  import('@/features/accounts').then((m) => ({ default: m.AccountsPage }))
);

// Inside route config:
{
  path: '/accounts',
  element: (
    <RequirePermission permissions={[Permission.VIEW_ACCOUNTS]}>
      <Suspense fallback={<PageSkeleton />}>
        <AccountsPage />
      </Suspense>
    </RequirePermission>
  ),
}
```

**Rules**:
- Every feature page is lazy-loaded via `React.lazy()`.
- `Suspense` fallback is a page-level skeleton, not a spinner.
- `RequirePermission` wraps the route with the required `Permission[]`.
- 403 is handled by `RequirePermission` internally (full-page Forbidden view, no toast).

---

### Step 9: Add NavItem

**File**: navigation config (wherever `NavItem[]` is defined)

```typescript
{
  id: 'accounts',
  label: 'Accounts',
  icon: Building2,
  path: '/accounts',
  permissions: [Permission.VIEW_ACCOUNTS],
  badge: undefined, // or { count: pendingCount, variant: 'warning' }
}
```

**Rules**:
- Every NavItem declares `permissions[]`. Items are auto-filtered by `useHasPermission()`.
- `badge` is optional: `{ count: number, variant: 'danger' | 'warning' | 'info' }`.
- `featureFlag` is optional: gates the item behind a flag without modifying the component.
- Icon comes from `lucide-react`.

---

### Step 10: Add Storybook stories

**File**: `stories/accounts-table.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { AccountsTable } from '../src/features/accounts/components/accounts-table';

const meta: Meta<typeof AccountsTable> = {
  title: 'Features/Accounts/AccountsTable',
  component: AccountsTable,
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<typeof AccountsTable>;

export const Loading: Story = {
  parameters: { mockData: { isLoading: true } },
};

export const Empty: Story = {
  parameters: { mockData: { items: [], total: 0 } },
};

export const WithData: Story = {
  parameters: { mockData: { items: mockAccounts, total: 3 } },
};

export const Error: Story = {
  parameters: { mockData: { isError: true, error: new Error('Failed to fetch') } },
};
```

**Rules**:
- One story file per component (not per feature).
- Every data component must have stories for: Loading, Empty, Data, Error.
- Use `parameters.mockData` or MSW handlers to supply mock data.
- Stories live in `apps/admin-web/stories/` and mirror the `features/` structure.

---

## Scaffold Checklist

Before marking a feature as complete, verify every item:

- [ ] All 10 steps above executed in order
- [ ] No `axios` or `@tanstack/react-query` imports in component files
- [ ] No DTOs passed directly to components — all go through a mapper
- [ ] No raw hex colors — all classes from DESIGN.md tokens
- [ ] No `useEffect` for data fetching
- [ ] Loading state is a skeleton, never a spinner
- [ ] Empty state has icon + title + description
- [ ] Error state has Retry button
- [ ] Delete actions have AlertDialog confirmation
- [ ] Icon-only buttons have `aria-label`
- [ ] Table has `<caption>` (visually hidden is fine)
- [ ] Query keys are structured for granular invalidation
- [ ] `staleTime` matches the tier in CLAUDE.md
- [ ] AbortSignal is passed through to `apiClient`
- [ ] Toast only on mutations (200/201 = success 4s, 5xx = error sticky + Retry; never toast 401/403)

---

## Cross-References

| File | Covers |
|---|---|
| `apps/admin-web/CLAUDE.md` | Architecture, state strategy, permissions, auth, coding constraints |
| `apps/admin-web/DESIGN.md` | Visual design: palette, typography, spacing, components |
| `.claude/rules/admin-web-ui.md` | Behavioral conventions: tables, async states, toasts, destructive actions |
| `.claude/rules/compliance-checklist.md` | Project-wide pre-commit quality gates |
