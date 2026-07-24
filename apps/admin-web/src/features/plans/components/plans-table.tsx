import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertDialog } from '@shared/ui/alert-dialog';
import type { DropdownMenuItem } from '@shared/ui/dropdown-menu';
import { DropdownMenu } from '@shared/ui/dropdown-menu';
import { Search, Tag } from 'lucide-react';

import { useDeletePlan } from '../hooks/useDeletePlan';
import { useGetPlans } from '../hooks/useGetPlans';
import type { PlanListViewModel } from '../view-models/plan-view-model';

import { PlanFormDialog, type PlanFormDialogMode } from './plan-form-dialog';
import { PlanSubscribersDrawer } from './plan-subscribers-drawer';
import { PLAN_COLUMNS } from './plans-columns';

const PAGE_SIZE = 20;

export function PlansTable(): JSX.Element {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<PlanFormDialogMode>('create');
  const [dialogPlanId, setDialogPlanId] = useState<string | null>(null);
  const [dialogSourcePlan, setDialogSourcePlan] = useState<PlanListViewModel | null>(null);

  // Drawer state
  const [drawerPlanId, setDrawerPlanId] = useState<string | null>(null);
  const [drawerPlanName, setDrawerPlanName] = useState<string>('');

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<PlanListViewModel | null>(null);

  const deleteMutation = useDeletePlan();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  const { data, isLoading, isError, error, isFetching, refetch } = useGetPlans({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  // Dialog openers
  const handleNewPlan = useCallback(() => {
    setDialogMode('create');
    setDialogPlanId(null);
    setDialogSourcePlan(null);
    setDialogOpen(true);
  }, []);

  const handleEditPlan = useCallback((plan: PlanListViewModel) => {
    setDialogMode('edit');
    setDialogPlanId(plan.id);
    setDialogSourcePlan(null);
    setDialogOpen(true);
  }, []);

  const handleDuplicatePlan = useCallback((plan: PlanListViewModel) => {
    setDialogMode('duplicate');
    setDialogPlanId(null);
    setDialogSourcePlan(plan);
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setDialogPlanId(null);
    setDialogSourcePlan(null);
  }, []);

  // Drawer opener
  const handleSubscribersClick = useCallback((plan: PlanListViewModel) => {
    setDrawerPlanId(plan.id);
    setDrawerPlanName(plan.name);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerPlanId(null);
    setDrawerPlanName('');
  }, []);

  // Delete handlers
  const handleDeleteClick = useCallback((plan: PlanListViewModel) => {
    setDeleteTarget(plan);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSettled: () => {
        setDeleteTarget(null);
      },
    });
  }, [deleteTarget, deleteMutation]);

  const handleCancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const isDeleting = deleteMutation.isPending;

  // Cell renderers per column
  const renderCell = useCallback(
    (plan: PlanListViewModel, columnKey: string) => {
      switch (columnKey) {
        case 'name':
          return <span className="font-medium text-on-surface">{plan.name}</span>;
        case 'price':
          return (
            <span className="font-mono text-on-surface-variant">${plan.price.toFixed(2)}</span>
          );
        case 'maxAlarms':
          return <span className="font-mono text-on-surface-variant">{plan.maxAlarmsLabel}</span>;
        case 'conditions':
          return <span className="font-mono text-on-surface-variant">{plan.conditionCount}</span>;
        case 'channels':
          return (
            <div className="flex flex-wrap gap-1">
              {plan.channelBadges.map((badge) => (
                <span
                  key={badge.label}
                  className="rounded-sm bg-surface-container-high px-1.5 py-0.5 text-body-xs text-on-surface-variant"
                >
                  {badge.label}
                </span>
              ))}
            </div>
          );
        case 'ai':
          return (
            <span className="text-on-surface-variant">{plan.features.aiAlarms ? 'Yes' : 'No'}</span>
          );
        case 'subscribers':
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSubscribersClick(plan);
              }}
              className="font-mono text-primary underline underline-offset-2 hover:text-primary-hover"
              aria-label={t('plans.subscribers.title', { planName: plan.name })}
            >
              {plan.subscriberCount}
            </button>
          );
        default:
          return null;
      }
    },
    [t, handleSubscribersClick],
  );

  // 1. Loading
  if (isLoading) {
    return (
      <div className="space-y-sm">
        <div className="h-9 animate-pulse rounded-sm bg-surface-container-high" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-sm bg-surface-container-high" />
        ))}
      </div>
    );
  }

  // 2. Error
  if (isError) {
    return (
      <div className="rounded-md border border-danger bg-danger-muted p-md text-sm">
        <p className="text-danger">{error instanceof Error ? error.message : t('common.error')}</p>
        <button
          onClick={() => {
            void refetch();
          }}
          className="mt-sm rounded-sm bg-danger px-3 py-1 text-sm text-white transition-colors hover:bg-danger/80"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  // 3. Empty
  if (!data || data.items.length === 0) {
    return (
      <div className="py-xl text-center">
        <Tag size={48} className="mx-auto text-on-surface-variant" aria-hidden="true" />
        <p className="mt-md text-lg font-semibold text-on-surface">{t('plans.empty.title')}</p>
        <p className="mt-sm text-body-sm text-on-surface-variant">{t('plans.empty.description')}</p>
        <button
          onClick={handleNewPlan}
          className="mt-md rounded-sm bg-primary px-3 py-1.5 text-body-sm text-white transition-colors hover:bg-primary-hover"
        >
          {t('plans.create.button')}
        </button>
      </div>
    );
  }

  // 4. Data
  return (
    <div>
      {/* Search + New Plan button */}
      <div className="mb-sm flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
            }}
            placeholder={t('plans.searchPlaceholder')}
            aria-label={t('plans.searchPlaceholder')}
            className="w-full rounded-sm border border-outline-variant bg-surface py-2 pl-9 pr-3 text-body-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={handleNewPlan}
          className="rounded-sm bg-primary px-3 py-1.5 text-body-sm text-white transition-colors hover:bg-primary-hover"
        >
          {t('plans.create.button')}
        </button>
      </div>

      {/* Background refetch progress */}
      {isFetching && <div className="h-0.5 w-full animate-pulse bg-primary/20" />}

      {/* Table */}
      <div className="rounded-md border border-outline-variant">
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <caption className="sr-only">{t('plans.table.caption')}</caption>
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-left text-label-xs font-mono uppercase text-on-surface-variant">
                {PLAN_COLUMNS.map((col) => (
                  <th key={col.key} className={`p-sm ${col.isNumeric ? 'text-right' : ''}`}>
                    {t(col.headerKey)}
                  </th>
                ))}
                <th className="w-14 p-sm">{t('plans.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((plan) => (
                <PlanRow
                  key={plan.id}
                  plan={plan}
                  onEdit={handleEditPlan}
                  onDuplicate={handleDuplicatePlan}
                  onDelete={handleDeleteClick}
                  renderCell={renderCell}
                  isDeleting={isDeleting && deleteMutation.variables === plan.id}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-outline-variant px-sm py-sm">
          <span className="text-body-sm text-on-surface-variant">
            {t('plans.pagination.info', {
              page,
              totalPages,
              total: data.total,
            })}
          </span>
          <div className="flex gap-xs">
            <button
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
              }}
              disabled={page <= 1}
              className="rounded-sm px-sm py-xs text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-30"
            >
              {t('common.prev')}
            </button>
            <button
              onClick={() => {
                setPage((p) => p + 1);
              }}
              disabled={page >= totalPages}
              className="rounded-sm px-sm py-xs text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-30"
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      </div>

      {/* Form dialog */}
      <PlanFormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        mode={dialogMode}
        planId={dialogMode === 'edit' ? dialogPlanId : null}
        sourcePlan={dialogMode === 'duplicate' ? dialogSourcePlan : null}
      />

      {/* Subscribers drawer */}
      <PlanSubscribersDrawer
        planId={drawerPlanId}
        planName={drawerPlanName}
        onClose={handleCloseDrawer}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        title={t('plans.delete.title')}
        description={t('plans.delete.description')}
        confirmLabel={isDeleting ? t('common.loading') : t('plans.delete.confirm')}
        cancelLabel={t('common.close')}
        onConfirm={handleDeleteConfirm}
        onCancel={handleCancelDelete}
        destructive
        isLoading={isDeleting}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

interface PlanRowProps {
  plan: PlanListViewModel;
  onEdit: (plan: PlanListViewModel) => void;
  onDuplicate: (plan: PlanListViewModel) => void;
  onDelete: (plan: PlanListViewModel) => void;
  renderCell: (plan: PlanListViewModel, columnKey: string) => React.ReactNode;
  isDeleting: boolean;
}

function PlanRow({
  plan,
  onEdit,
  onDuplicate,
  onDelete,
  renderCell,
  isDeleting,
}: PlanRowProps): JSX.Element {
  const { t } = useTranslation();

  const menuItems: DropdownMenuItem[] = useMemo(
    () => [
      {
        id: 'edit',
        label: t('plans.edit.title', 'Edit'),
        onSelect: () => {
          onEdit(plan);
        },
      },
      {
        id: 'duplicate',
        label: t('plans.duplicate.title', 'Duplicate'),
        onSelect: () => {
          onDuplicate(plan);
        },
      },
      {
        id: 'delete',
        label: t('plans.delete.title', 'Delete'),
        onSelect: () => {
          onDelete(plan);
        },
        destructive: true,
        disabled: isDeleting,
      },
    ],
    [t, plan, onEdit, onDuplicate, onDelete, isDeleting],
  );

  return (
    <tr
      className="cursor-pointer border-b border-outline-variant transition-colors hover:bg-surface-container-high last:border-b-0"
      onClick={() => {
        onEdit(plan);
      }}
    >
      {PLAN_COLUMNS.map((col) => (
        <td key={col.key} className={`p-sm ${col.isNumeric ? 'text-right' : ''}`}>
          {renderCell(plan, col.key)}
        </td>
      ))}
      <td
        className="p-sm"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <DropdownMenu
          triggerLabel={t('plans.table.actions')}
          triggerAriaLabel={t('plans.table.actions') + ' — ' + plan.name}
          items={menuItems}
        />
      </td>
    </tr>
  );
}
