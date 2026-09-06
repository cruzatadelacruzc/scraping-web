import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import type { Extension } from '@codemirror/state';

import type { EditorPreset } from './editor-types';

const PRESET_EXTENSIONS: Record<EditorPreset, () => Extension> = {
  json: () => json(),
  // JSONata has no dedicated CodeMirror grammar. The JavaScript language does
  // syntax highlighting only (no linter is attached), so it never rejects a
  // valid JSONata expression — it just colours strings, numbers, operators,
  // brackets and calls. jsx/typescript off keeps it to plain expression tokens.
  jsonata: () => javascript({ jsx: false, typescript: false }),
  markdown: () => markdown(),
};

export function resolvePresetExtension(preset: EditorPreset): Extension {
  const factory = PRESET_EXTENSIONS[preset];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive check for future presets
  if (!factory) throw new Error(`CodeEditor preset "${preset}" is not registered`);
  return factory();
}
