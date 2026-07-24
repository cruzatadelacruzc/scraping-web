import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@shared/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';

import type { PlanDTO } from '../../plans/services/plans-service';
import { plansService } from '../../plans/services/plans-service';
import { useAssignSubscription } from '../hooks/useAssignSubscription';

interface Props {
  open: boolean;
  onClose: () => void;
  currentPlanId?: string;
  accountId: string;
  onSelect: (planId: string) => void;
}

function featureSummary(plan: PlanDTO): string {
  const parts: string[] = [];
  const maxAlarms =
    plan.features.maxAlarms === -1
      ? 'Unlimited alarms'
      : String(plan.features.maxAlarms) + ' alarms';
  parts.push(maxAlarms);
  if (plan.features.aiAlarms) {
    parts.push('AI alarms');
  }
  return parts.join(' · ');
}

export function PlanSelectorDialog({
  open,
  onClose,
  currentPlanId,
  accountId,
  onSelect,
}: Props): JSX.Element {
  const { t } = useTranslation();
  const assignMutation = useAssignSubscription();

  const { data: plansData, isLoading } = useQuery({
    queryKey: ['plans', 'all'],
    queryFn: async () => {
      const { data } = await plansService.list({ skip: 0, limit: 100 });
      return data.plans;
    },
    enabled: open,
    staleTime: 30 * 60 * 1000,
  });

  const handleSelect = useCallback(
    (planId: string) => {
      assignMutation.mutate(
        { accountId, planId },
        {
          onSuccess: () => {
            onSelect(planId);
            onClose();
          },
        },
      );
    },
    [accountId, assignMutation, onClose, onSelect],
  );

  return (
    <Dialog open={open} title={t('plans.title')} onClose={onClose} maxWidth="max-w-xl">
      {isLoading && (
        <div className="space-y-sm">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-sm bg-surface-container-highest" />
          ))}
        </div>
      )}

      {plansData && plansData.length === 0 && (
        <p className="text-body-sm text-on-surface-variant">{t('plans.empty.title')}</p>
      )}

      {plansData && plansData.length > 0 && (
        <div className="space-y-sm">
          {plansData.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            return (
              <button
                key={plan.id}
                onClick={() => {
                  handleSelect(plan.id);
                }}
                disabled={isCurrent || assignMutation.isPending}
                className={`w-full rounded-sm border p-sm text-left transition-colors ${
                  isCurrent
                    ? 'border-primary bg-primary-muted cursor-not-allowed opacity-60'
                    : 'border-outline-variant bg-surface hover:border-primary hover:bg-surface-container-low'
                } disabled:opacity-50`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-sm">
                      <span className="font-medium text-on-surface">{plan.name}</span>
                      {isCurrent && (
                        <span className="rounded-sm bg-primary px-sm py-0.5 text-label-xs font-medium text-white">
                          {t('plans.title')} Current
                        </span>
                      )}
                    </div>
                    <p className="mt-xs text-body-sm text-on-surface-variant line-clamp-1">
                      {plan.description}
                    </p>
                    <p className="mt-xs text-body-sm text-on-surface-variant">
                      {featureSummary(plan)}
                    </p>
                  </div>
                  <div className="ml-sm text-right">
                    <p className="font-medium text-on-surface">${plan.price.toFixed(2)}</p>
                    {isCurrent && <Check size={16} className="mt-xs text-primary" />}
                  </div>
                </div>
              </button>
            );
          })}

          {assignMutation.isPending && (
            <p className="text-center text-body-sm text-on-surface-variant">
              {t('common.loading')}
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
