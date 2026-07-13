import { useGetAccounts } from '../hooks/useGetAccounts';

export function AccountsTable(): JSX.Element {
  const { isLoading } = useGetAccounts({ page: 1, limit: 20 });

  if (isLoading) {
    return (
      <div className="space-y-sm" data-testid="accounts-loading">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-sm bg-surface-container-high" />
        ))}
      </div>
    );
  }

  return <div data-testid="accounts-data">Accounts loaded</div>;
}
