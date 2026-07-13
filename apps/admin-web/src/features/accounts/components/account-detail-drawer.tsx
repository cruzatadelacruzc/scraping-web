import { X } from 'lucide-react';
import { useGetAccount } from '../hooks/useGetAccount';

interface Props {
  accountId: string | null;
  onClose: () => void;
}

export function AccountDetailDrawer({ accountId, onClose }: Props): JSX.Element {
  const { data, isLoading, isError } = useGetAccount(accountId);
  const isOpen = accountId !== null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-96 transform border-l border-outline-variant bg-surface-container-high p-lg shadow-lg transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="mb-lg flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface">Account Detail</h2>
          <button
            onClick={onClose}
            className="rounded-sm p-xs text-on-surface-variant hover:bg-surface-container-highest"
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading && (
          <div className="space-y-sm">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 animate-pulse rounded-sm bg-surface-container-highest" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-md border border-danger bg-danger-muted p-md text-sm text-danger">
            Failed to load account details.
          </div>
        )}

        {data && (
          <dl className="space-y-md">
            <div>
              <dt className="text-label-xs font-mono text-on-surface-variant">Name</dt>
              <dd className="mt-xs text-body-md text-on-surface">{data.name}</dd>
            </div>
            <div>
              <dt className="text-label-xs font-mono text-on-surface-variant">Account ID</dt>
              <dd className="mt-xs font-mono text-body-sm text-on-surface-variant">{data.id}</dd>
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">Users</dt>
                <dd className="mt-xs text-body-md text-on-surface">{data.userCount}</dd>
              </div>
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">Subscriptions</dt>
                <dd className="mt-xs text-body-md text-on-surface">{data.subscriptionCount}</dd>
              </div>
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">Alarms</dt>
                <dd className="mt-xs text-body-md text-on-surface">{data.alarmCount}</dd>
              </div>
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">Created</dt>
                <dd className="mt-xs text-body-md text-on-surface">
                  {data.createdAt.toLocaleDateString()}
                </dd>
              </div>
            </div>
          </dl>
        )}
      </div>
    </>
  );
}
