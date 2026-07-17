import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';

import { useDeleteRule } from '../hooks/useDeleteRule';
import { useGetRules } from '../hooks/useGetRules';
import type { RuleViewModel } from '../view-models/rule-view-model';

import { RuleFormDialog } from './rule-form-dialog';

/**
 * Main Rules Engine table component.
 *
 * Renders four states in order:
 * 1. Loading — skeleton rows matching the table layout
 * 2. Error — error message with Retry button
 * 3. Empty — centered icon, title, description, and CTA
 * 4. Data — table with ruleKey, values count, version, status badge, and actions
 */
export function RulesTable(): JSX.Element {
  const { t } = useTranslation();

  const { data, isLoading, isError, error, refetch } = useGetRules();
  const deleteRule = useDeleteRule();

  // Dialog state
  const [dialog, setDialog] = useState<{
    mode: 'create' | 'edit';
    ruleKey?: string;
  } | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<RuleViewModel | null>(null);

  const handleCloseDialog = useCallback(() => {
    setDialog(null);
  }, []);

  const handleCreateClick = useCallback(() => {
    setDialog({ mode: 'create' });
  }, []);

  // ── 1. Loading ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-sm">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 animate-pulse rounded-sm bg-surface-container-high" />
          <div className="h-9 w-28 animate-pulse rounded-sm bg-surface-container-high" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-sm bg-surface-container-high" />
        ))}
      </div>
    );
  }

  // ── 2. Error ────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="rounded-md border border-danger bg-danger-muted p-md text-sm text-danger">
        <p className="font-semibold">{t('common.error', 'Something went wrong')}</p>
        <p className="mt-xs">{error instanceof Error ? error.message : ''}</p>
        <button
          onClick={() => {
            void refetch();
          }}
          className="mt-sm rounded-sm bg-danger px-sm py-xs text-white transition-opacity hover:opacity-90"
        >
          {t('common.retry', 'Retry')}
        </button>
      </div>
    );
  }

  // ── 3. Empty ────────────────────────────────────────────────────────────
  if (!data || data.items.length === 0) {
    return (
      <div className="py-xl text-center">
        <p className="text-lg font-semibold text-on-surface">
          {t('rules.emptyTitle', 'No rules yet')}
        </p>
        <p className="mt-sm text-body-sm text-on-surface-variant">
          {t(
            'rules.emptyDescription',
            'Create your first rule to start extracting product attributes.',
          )}
        </p>
        <button
          onClick={handleCreateClick}
          className="mt-md inline-flex items-center gap-xs rounded-sm bg-primary px-sm py-xs text-body-sm text-on-primary transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t('rules.newRule', 'New Rule')}
        </button>
        <RuleFormDialog open={false} mode="create" onClose={handleCloseDialog} />
      </div>
    );
  }

  // ── 4. Data ─────────────────────────────────────────────────────────────
  return (
    <div className="rounded-md border border-outline-variant">
      {/* Header + Create button */}
      <div className="flex items-center justify-between border-b border-outline-variant px-sm py-sm">
        <span className="text-body-sm font-semibold text-on-surface">
          {t('rules.tableCaption', 'Extraction rules list')}
        </span>
        <button
          onClick={handleCreateClick}
          className="inline-flex items-center gap-xs rounded-sm bg-primary px-sm py-xs text-body-sm text-on-primary transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t('rules.newRule', 'New Rule')}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm">
          <caption className="sr-only">{t('rules.tableCaption', 'Extraction rules list')}</caption>
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low text-left text-label-xs font-mono uppercase text-on-surface-variant">
              <th className="p-sm">{t('rules.ruleKey', 'Rule Key')}</th>
              <th className="p-sm">{t('rules.values', 'Values')}</th>
              <th className="p-sm">{t('rules.version', 'Version')}</th>
              <th className="p-sm">{t('rules.status', 'Status')}</th>
              <th className="p-sm w-12">{t('rules.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((rule) => (
              <tr
                key={rule.id}
                className="border-b border-outline-variant transition-colors hover:bg-surface-container-high"
              >
                <td className="p-sm font-mono font-medium text-on-surface">
                  <button
                    onClick={() => {
                      setDialog({ mode: 'edit', ruleKey: rule.ruleKey });
                    }}
                    className="text-left transition-colors hover:text-primary"
                  >
                    {rule.ruleKey}
                  </button>
                </td>
                <td className="p-sm">
                  <span className="inline-flex items-center rounded-full bg-surface-container-high px-xs py-0.5 text-label-xs font-mono text-on-surface-variant">
                    {t('rules.itemsCount', { count: rule.valuesCount })}
                  </span>
                </td>
                <td className="p-sm font-mono text-on-surface-variant">v{rule.version}</td>
                <td className="p-sm">
                  <span
                    className={`inline-flex items-center gap-xs rounded-full px-xs py-0.5 text-label-xs font-medium ${
                      rule.enabled
                        ? 'bg-success-muted text-success'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        rule.enabled ? 'bg-success' : 'bg-on-surface-variant'
                      }`}
                    />
                    {rule.enabled
                      ? t('rules.statusActive', 'Active')
                      : t('rules.statusInactive', 'Inactive')}
                  </span>
                </td>
                <td className="p-sm">
                  <div className="flex items-center gap-xs">
                    <button
                      onClick={() => {
                        setDialog({ mode: 'edit', ruleKey: rule.ruleKey });
                      }}
                      className="rounded-sm p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                      aria-label={t('rules.edit', 'Edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTarget(rule);
                      }}
                      className="rounded-sm p-1 text-on-surface-variant transition-colors hover:bg-danger-muted hover:text-danger"
                      aria-label={t('rules.delete', 'Delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with total */}
      <div className="flex items-center justify-between border-t border-outline-variant px-sm py-sm">
        <span className="text-body-sm text-on-surface-variant">
          {t('rules.itemsCount', { count: data.total })}
        </span>
      </div>

      {/* ── Rule Form Dialog ─────────────────────────────────────────────── */}
      <RuleFormDialog
        open={dialog !== null}
        mode={dialog?.mode ?? 'create'}
        ruleKey={dialog?.ruleKey}
        onClose={handleCloseDialog}
      />

      {/* ── Delete Confirmation Dialog ────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-black/60">
          <div className="w-full max-w-sm rounded-md border border-outline-variant bg-surface p-md shadow-lg">
            <h3 className="text-headline-sm text-on-surface">
              {t('rules.deleteTitle', 'Delete rule?')}
            </h3>
            <p className="mt-sm text-body-sm text-on-surface-variant">
              {t('rules.deleteDescription', {
                ruleKey: deleteTarget.ruleKey,
              })}
            </p>
            <div className="mt-md flex justify-end gap-xs">
              <button
                onClick={() => {
                  setDeleteTarget(null);
                }}
                disabled={deleteRule.isPending}
                className="rounded-sm border border-outline-variant px-sm py-xs text-body-sm text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50"
              >
                {t('rules.deleteCancel', 'Cancel')}
              </button>
              <button
                onClick={() => {
                  deleteRule.mutate(deleteTarget.ruleKey, {
                    onSuccess: () => {
                      setDeleteTarget(null);
                    },
                  });
                }}
                disabled={deleteRule.isPending}
                className="inline-flex items-center gap-xs rounded-sm bg-danger px-sm py-xs text-body-sm text-on-danger transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {deleteRule.isPending && <MoreHorizontal className="h-4 w-4 animate-pulse" />}
                {t('rules.permanentlyDelete', 'Permanently Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
