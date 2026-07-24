import type { Extension } from '@codemirror/state';
export type EditorPreset = 'json';
export interface CodeEditorProps {
  preset: EditorPreset;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  extensions?: Extension[];
  placeholder?: string;
}
