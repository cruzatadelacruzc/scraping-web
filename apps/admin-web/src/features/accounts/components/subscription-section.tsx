import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertDialog } from '@shared/ui/alert-dialog';
import { differenceInDays, parseISO } from 'date-fns';

import { useCancelSubscription } from '../hooks/useCancelSubscription';
import { useGetAccountSubscriptions } from '../hooks/useGetAccountSubscriptions';

import { PlanSelectorDialog } from './plan-selector-dialog';

interface Props {
  accountId: string;
}

const STATUS_COLORS: Record<string, string> = {
  TRIALING: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  PAST_DUE: 'bg-amber-100 text-amber-800',
  CANCELED: 'bg-red-100 text-red-800',
};

function statusBadgeClasses(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-surface-container-highest text-on-surface-variant';
}

export function SubscriptionSection({ accountId }: Props): JSX.Element {
  const { t } = useTranslation();
  const { data: subscriptions, isLoading, isError } = useGetAccountSubscriptions(accountId);
  const cancelMutation = useCancelSubscription(accountId);

  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  // Find active subscription (first non-CANCELED, prefer ACTIVE/TRIALING)
  const activeSub = subscriptions?.find(
    (sub) => sub.status === 'ACTIVE' || sub.status === 'TRIALING' || sub.status === 'PAST_DUE',
  );
  const historySubs =
    subscriptions?.filter(
      (sub) => sub.status === 'CANCELED' || (activeSub && sub.id !== activeSub.id),
    ) ?? [];

  const handleCancelConfirm = useCallback(() => {
    if (!cancelTarget) return;
    cancelMutation.mutate(cancelTarget, {
      onSuccess: () => {
        setCancelTarget(null);
      },
    });
  }, [cancelTarget, cancelMutation]);

  const handleAssignOrChange = useCallback((_planId: string) => {
    setShowPlanSelector(false);
    // Mutation is handled inside PlanSelectorDialog
  }, []);

  const handleShowPlanSelector = useCallback(() => {
    setShowPlanSelector(true);
  }, []);

  const handleClosePlanSelector = useCallback(() => {
    setShowPlanSelector(false);
  }, []);

  const handleStartCancel = useCallback((id: string) => {
    setCancelTarget(id);
  }, []);

  const handleCancelCancel = useCallback(() => {
    setCancelTarget(null);
  }, []);

  const remainingDays = activeSub ? differenceInDays(parseISO(activeSub.periodEnd), new Date()) : 0;
  const isExpiring = remainingDays < 7;

  if (isLoading) {
    return (
      <div className="space-y-sm">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-6 animate-pulse rounded-sm bg-surface-container-highest" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md border border-danger bg-danger-muted p-md text-sm text-danger">
        {t('common.error')}
      </div>
    );
  }

  return (
    <div className="space-y-md">
      {activeSub ? (
        <div className="space-y-sm">
          <div className="flex items-center gap-sm">
            <span className="rounded-sm bg-primary-muted px-sm py-xs text-body-sm font-medium text-primary">
              {activeSub.planName}
            </span>
            <span
              className={`inline-block rounded-full px-sm py-0.5 text-label-xs font-medium ${statusBadgeClasses(activeSub.status)}`}
            >
              {activeSub.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-sm text-body-sm">
            <div>
              <span className="text-label-xs font-mono text-on-surface-variant">
                {t('accounts.subscription.period')}
              </span>
              <p className="mt-0.5 text-on-surface">
                {new Date(activeSub.periodStart).toLocaleDateString()} —{' '}
                {new Date(activeSub.periodEnd).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-label-xs font-mono text-on-surface-variant">
                {t('accounts.subscription.remaining')}
              </span>
              <p className={`mt-0.5 ${isExpiring ? 'text-danger' : 'text-on-surface'}`}>
                {remainingDays >= 0
                  ? t('accounts.subscription.daysLeft', { count: remainingDays })
                  : t('accounts.subscription.expiresSoon')}
              </p>
            </div>
          </div>

          <div className="flex gap-sm">
            <button
              onClick={handleShowPlanSelector}
              className="rounded-sm bg-primary px-sm py-xs text-body-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              {t('accounts.subscription.changePlan')}
            </button>
            <button
              onClick={() => {
                handleStartCancel(activeSub.id);
              }}
              className="rounded-sm border border-danger px-sm py-xs text-body-sm font-medium text-danger transition-colors hover:bg-danger-muted"
            >
              {t('accounts.subscription.cancel.label')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-sm">
          <p className="text-body-sm text-on-surface-variant">
            {t('accounts.subscription.noActiveSubscription')}
          </p>
          <button
            onClick={handleShowPlanSelector}
            className="rounded-sm bg-primary px-sm py-xs text-body-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            {t('accounts.subscription.assignPlan')}
          </button>
        </div>
      )}

      {/* Subscription history */}
      {historySubs.length > 0 && (
        <div className="pt-sm">
          <h4 className="text-label-xs font-mono uppercase text-on-surface-variant mb-xs">
            {t('accounts.subscription.history.label')}
          </h4>
          <div className="space-y-xs">
            {historySubs.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between rounded-sm bg-surface-container-low px-sm py-xs text-body-sm"
              >
                <span className="font-medium text-on-surface">{sub.planName}</span>
                <span
                  className={`inline-block rounded-full px-sm py-0.5 text-label-xs font-medium ${statusBadgeClasses(sub.status)}`}
                >
                  {sub.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty history */}
      {!activeSub && subscriptions && subscriptions.length === 0 && (
        <p className="text-body-sm text-on-surface-variant">
          {t('accounts.subscription.history.empty')}
        </p>
      )}

      {/* Plan selector dialog */}
      <PlanSelectorDialog
        open={showPlanSelector}
        onClose={handleClosePlanSelector}
        currentPlanId={activeSub?.planId}
        accountId={accountId}
        onSelect={handleAssignOrChange}
      />

      {/* Cancel confirmation dialog */}
      <AlertDialog
        open={cancelTarget !== null}
        title={t('accounts.subscription.cancel.title')}
        description={t('accounts.subscription.cancel.description')}
        confirmLabel={
          cancelMutation.isPending ? t('common.loading') : t('accounts.subscription.cancel.confirm')
        }
        cancelLabel={t('accounts.delete.cancel')}
        onConfirm={handleCancelConfirm}
        onCancel={handleCancelCancel}
        destructive
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
