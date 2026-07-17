import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { sql } from '@codemirror/lang-sql';
import { xml } from '@codemirror/lang-xml';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import { Loader2 } from 'lucide-react';

import { useCreateRule } from '../hooks/useCreateRule';
import { useGetRule } from '../hooks/useGetRule';
import { useUpdateRule } from '../hooks/useUpdateRule';
import { createRuleFormSchema, updateRuleFormSchema } from '../schemas/rule-schemas';

type EditorLang = 'json' | 'javascript' | 'js' | 'css' | 'html' | 'xml' | 'markdown' | 'md' | 'sql';

/** Resolved once at module load from VITE_ env vars. */
const EDITOR_LANGUAGE: EditorLang = ((import.meta.env as Record<string, unknown>)
  .VITE_EDITOR_LANGUAGE ?? 'json') as EditorLang;

const THEME =
  (import.meta.env as Record<string, unknown>).VITE_EDITOR_THEME === 'light' ? 'light' : 'dark';

const FONT_SIZE = Number((import.meta.env as Record<string, unknown>).VITE_EDITOR_FONT_SIZE) || 14;

const LINE_WRAPPING =
  (import.meta.env as Record<string, unknown>).VITE_EDITOR_LINE_WRAPPING !== 'false';

/** Map env-friendly language keys to CodeMirror language extensions. */
const LANGUAGE_MAP: Record<EditorLang, () => Extension> = {
  json: () => json(),
  javascript: () => javascript(),
  js: () => javascript(),
  css: () => css(),
  html: () => html(),
  xml: () => xml(),
  markdown: () => markdown(),
  md: () => markdown(),
  sql: () => sql(),
};

function resolveLanguageExtension(): Extension {
  return LANGUAGE_MAP[EDITOR_LANGUAGE]();
}

const BASIC_SETUP = {
  lineNumbers: true,
  foldGutter: true,
  bracketMatching: true,
  closeBrackets: true,
  highlightActiveLine: true,
};

const EDITOR_STYLE = { fontSize: `${String(FONT_SIZE)}px` };

export interface RuleFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Dialog mode. */
  mode: 'create' | 'edit';
  /** Required when mode is 'edit'. */
  ruleKey?: string;
}

/**
 * Dialog for creating or editing a rule. Uses CodeMirror 6 for the values
 * editor with syntax highlighting and code folding.
 *
 * The editor language, theme, font size, and line wrapping are configurable
 * via VITE_EDITOR_* env vars. Defaults to JSON with dark theme.
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

  // Build CodeMirror extensions once
  const extensions = useMemo(() => {
    const ext: Extension[] = [resolveLanguageExtension()];
    if (LINE_WRAPPING) ext.push(EditorView.lineWrapping);
    return ext;
  }, []);

  const handleCodeMirrorChange = useCallback((val: string) => {
    setValuesStr(val);
  }, []);

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

        {/* Values editor (CodeMirror) */}
        <div className="mt-md">
          <label className="block text-label-sm text-on-surface-variant">
            {t('rules.values', 'Values')}
          </label>
          <div className="mt-xs overflow-hidden rounded-sm border border-outline-variant">
            <CodeMirror
              value={valuesStr}
              onChange={handleCodeMirrorChange}
              theme={THEME}
              height="200px"
              basicSetup={BASIC_SETUP}
              style={EDITOR_STYLE}
              extensions={extensions}
              editable={!isPending}
            />
          </div>
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
