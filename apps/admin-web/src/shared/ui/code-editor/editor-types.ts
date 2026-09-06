import type { Extension } from '@codemirror/state';

export type EditorPreset = 'json' | 'jsonata' | 'markdown';

export interface CodeEditorProps {
  preset: EditorPreset;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  /** Editor height. When `resizable`, this is the initial height of the drag container. */
  height?: string;
  /** Lower bound the user cannot drag past. Only applies when `resizable`. */
  minHeight?: string;
  /** Render inside a container the user can drag taller from its bottom edge, like a textarea. */
  resizable?: boolean;
  /** Accessible name for the editing surface, since CodeMirror has no external `<label>` to bind. */
  ariaLabel?: string;
  extensions?: Extension[];
  placeholder?: string;
}
