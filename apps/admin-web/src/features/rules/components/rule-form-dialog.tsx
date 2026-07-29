import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CodeEditor } from '@shared/ui/code-editor';
import { Loader2 } from 'lucide-react';

import { useCreateRule } from '../hooks/useCreateRule';
import { useGetRule } from '../hooks/useGetRule';
import { useUpdateRule } from '../hooks/useUpdateRule';
import { createRuleFormSchema, updateRuleFormSchema } from '../schemas/rule-schemas';

export interface RuleFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Dialog mode. */
  mode: 'create' | 'edit';
  /** Required when mode is 'edit'. */
  ruleKey?: string;
}

/**
 * Dialog for creating or editing a rule. Uses the shared CodeEditor component
 * with JSON syntax highlighting and code folding.
 */
export function RuleFormDialog({
  open,
  onClose,
  mode,
  ruleKey,
}: RuleFormDialogProps): JSX.Element | null {
  const { t } = useTranslation();

  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const { data: existingRule } = useGetRule(mode === 'edit' && ruleKey ? ruleKey : '');

  // Form state
  const [ruleKeyInput, setRuleKeyInput] = useState('');
  const [valuesStr, setValuesStr] = useState('[]');
  const [validationError, setValidationError] = useState<string | null>(null);

  const isPending = createRule.isPending || updateRule.isPending;

  // Pre-fill editor when editing an existing rule
  useEffect(() => {
    if (mode === 'edit' && existingRule) {
      setValuesStr(JSON.stringify(existingRule.values, null, 2));
    }
  }, [mode, existingRule]);

  // Reset form when dialog opens for create
  useEffect(() => {
    if (mode === 'create' && open) {
      setRuleKeyInput('');
      setValuesStr('[]');
      setValidationError(null);
    }
  }, [mode, open]);

  /** Parse and validate the editor content. Returns parsed values or null. */
  const validate = useCallback((): string[] | null => {
    setValidationError(null);
    try {
      if (mode === 'create') {
        const result = createRuleFormSchema.safeParse({
          ruleKey: ruleKeyInput.trim(),
          valuesStr,
        });
        if (!result.success) {
          setValidationError(result.error.issues[0].message);
          return null;
        }
        return JSON.parse(result.data.valuesStr) as string[];
      }
      // Edit mode
      const result = updateRuleFormSchema.safeParse({ valuesStr });
      if (!result.success) {
        setValidationError(result.error.issues[0].message);
        return null;
      }
      return JSON.parse(result.data.valuesStr) as string[];
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Invalid values');
      return null;
    }
  }, [mode, ruleKeyInput, valuesStr]);

  /** Handle form submission. */
  const handleSubmit = useCallback(() => {
    const values = validate();
    if (!values) return;

    if (mode === 'create') {
      createRule.mutate(
        { ruleKey: ruleKeyInput.trim(), values },
        {
          onSuccess: () => {
            onClose();
          },
        },
      );
    } else if (ruleKey) {
      updateRule.mutate(
        { ruleKey, values },
        {
          onSuccess: () => {
            onClose();
          },
        },
      );
    }
  }, [mode, ruleKey, ruleKeyInput, validate, createRule, updateRule, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-black/60">
      <div className="w-full max-w-lg rounded-md border border-outline-variant bg-surface p-md shadow-lg">
        {/* Title */}
        <h3 className="text-headline-sm text-on-surface">
          {mode === 'create'
            ? t('rules.createTitle', 'Create Rule')
            : t('rules.editTitle', 'Edit Rule')}
        </h3>

        {/* Rule Key field */}
        <div className="mt-md">
          <label className="block text-label-sm text-on-surface-variant" htmlFor="ruleKey">
            {t('rules.ruleKey', 'Rule Key')}
          </label>
          {mode === 'create' ? (
            <input
              id="ruleKey"
              type="text"
              value={ruleKeyInput}
              onChange={(e) => {
                setRuleKeyInput(e.target.value);
              }}
              placeholder={t('rules.ruleKeyPlaceholder', 'e.g. brands')}
              disabled={isPending}
              className="mt-xs w-full rounded-sm border border-outline-variant bg-surface px-sm py-xs text-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          ) : (
            <p className="mt-xs text-body-sm font-mono text-on-surface-variant">{ruleKey}</p>
          )}
        </div>

        {/* Values editor */}
        <div className="mt-md">
          <label className="block text-label-sm text-on-surface-variant">
            {t('rules.values', 'Values')}
          </label>
          <CodeEditor
            preset="json"
            value={valuesStr}
            onChange={setValuesStr}
            height="200px"
            readOnly={isPending}
          />
        </div>

        {/* Validation error */}
        {validationError && <p className="mt-sm text-body-sm text-danger">{validationError}</p>}

        {/* Actions */}
        <div className="mt-md flex justify-end gap-sm">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-sm border border-outline-variant px-sm py-xs text-body-sm text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50"
          >
            {t('rules.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="inline-flex items-center gap-xs rounded-sm bg-primary px-sm py-xs text-body-sm text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('rules.save', 'Save Rule')}
          </button>
        </div>
      </div>
    </div>
  );
}
