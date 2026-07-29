import { EditorView } from '@codemirror/view';

export const EDITOR_CONFIG = {
  theme:
    (import.meta.env as Record<string, unknown>).VITE_EDITOR_THEME === 'light' ? 'light' : 'dark',
  fontSize: Number((import.meta.env as Record<string, unknown>).VITE_EDITOR_FONT_SIZE) || 14,
  lineWrapping: (import.meta.env as Record<string, unknown>).VITE_EDITOR_LINE_WRAPPING !== 'false',
} as const;

export const BASIC_SETUP = {
  lineNumbers: true,
  foldGutter: true,
  bracketMatching: true,
  closeBrackets: true,
  highlightActiveLine: true,
} as const;

export function getLineWrappingExtension() {
  return EDITOR_CONFIG.lineWrapping ? EditorView.lineWrapping : null;
}
