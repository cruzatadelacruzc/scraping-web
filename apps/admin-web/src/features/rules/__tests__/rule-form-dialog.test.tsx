import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// CodeMirror 6 is a heavy DOM-based editor — replace with a simple textarea
vi.mock('@uiw/react-codemirror', () => ({
  default: ({
    value,
    onChange,
    editable,
  }: {
    value: string;
    onChange: (v: string) => void;
    editable: boolean;
  }) =>
    React.createElement('textarea', {
      'data-testid': 'codemirror',
      value,
      onChange: (e: Event) => {
        onChange((e.target as HTMLTextAreaElement).value);
      },
      readOnly: !editable,
    }),
}));

// CodeMirror language extensions (imported directly by the component)
vi.mock('@codemirror/lang-css', () => ({ css: vi.fn() }));
vi.mock('@codemirror/lang-html', () => ({ html: vi.fn() }));
vi.mock('@codemirror/lang-javascript', () => ({ javascript: vi.fn() }));
vi.mock('@codemirror/lang-json', () => ({ json: vi.fn() }));
vi.mock('@codemirror/lang-markdown', () => ({ markdown: vi.fn() }));
vi.mock('@codemirror/lang-sql', () => ({ sql: vi.fn() }));
vi.mock('@codemirror/lang-xml', () => ({ xml: vi.fn() }));
vi.mock('@codemirror/view', () => ({ EditorView: { lineWrapping: Symbol('lineWrapping') } }));

// Hook mocks
const mockCreateRule = vi.fn();
const mockUpdateRule = vi.fn();

vi.mock('../hooks/useCreateRule', () => ({
  useCreateRule: () => ({
    mutate: mockCreateRule,
    isPending: false,
  }),
}));

vi.mock('../hooks/useUpdateRule', () => ({
  useUpdateRule: () => ({
    mutate: mockUpdateRule,
    isPending: false,
  }),
}));

// useGetRule uses a mutable variable so each test can control the return value
let mockRuleData: unknown = undefined;

vi.mock('../hooks/useGetRule', () => ({
  useGetRule: () => ({
    data: mockRuleData,
    isLoading: false,
  }),
}));

// ── Component under test ───────────────────────────────────────────────────

import { RuleFormDialog } from '../components/rule-form-dialog';

// ── Helpers ────────────────────────────────────────────────────────────────

function renderDialog(open: boolean, mode: 'create' | 'edit', ruleKey?: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(RuleFormDialog, {
        open,
        onClose: vi.fn(),
        mode,
        ruleKey,
      }),
    ),
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('RuleFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRuleData = undefined;
  });

  // ── Create mode ────────────────────────────────────────────────────

  describe('create mode', () => {
    it('renders the dialog with "Create Rule" title', () => {
      renderDialog(true, 'create');
      expect(screen.getByText('rules.createTitle')).toBeInTheDocument();
    });

    it('renders the rule key input as an editable text field with placeholder', () => {
      renderDialog(true, 'create');
      const input = screen.getByPlaceholderText('rules.ruleKeyPlaceholder');
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe('INPUT');
    });

    it('renders Cancel and Save Rule buttons', () => {
      renderDialog(true, 'create');
      expect(screen.getByText('rules.cancel')).toBeInTheDocument();
      expect(screen.getByText('rules.save')).toBeInTheDocument();
    });
  });

  // ── Edit mode ──────────────────────────────────────────────────────

  describe('edit mode', () => {
    beforeEach(() => {
      mockRuleData = {
        id: 'rule-1',
        ruleKey: 'brands',
        values: ['nike', 'adidas'],
        valuesCount: 2,
        version: 1,
        enabled: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        statusBadge: { label: 'Active', variant: 'success' },
      };
    });

    it('renders the dialog with "Edit Rule" title', () => {
      renderDialog(true, 'edit', 'brands');
      expect(screen.getByText('rules.editTitle')).toBeInTheDocument();
    });

    it('displays the rule key as text (not an editable input)', () => {
      renderDialog(true, 'edit', 'brands');
      // The rule key should be visible as plain text
      expect(screen.getByText('brands')).toBeInTheDocument();
      // There should be no editable rule key input
      expect(screen.queryByPlaceholderText('rules.ruleKeyPlaceholder')).not.toBeInTheDocument();
    });

    it('renders Cancel and Save Rule buttons', () => {
      renderDialog(true, 'edit', 'brands');
      expect(screen.getByText('rules.cancel')).toBeInTheDocument();
      expect(screen.getByText('rules.save')).toBeInTheDocument();
    });
  });

  // ── Closed state ───────────────────────────────────────────────────

  describe('closed state', () => {
    it('does not render any dialog content when open is false', () => {
      const { container } = renderDialog(false, 'create');
      // When open=false the component returns null; QueryClientProvider
      // renders null children, so the wrapper container is empty.
      expect(container.innerHTML).toBe('');
    });
  });
});
