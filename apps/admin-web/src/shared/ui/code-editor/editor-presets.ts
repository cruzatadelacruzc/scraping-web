import { json } from '@codemirror/lang-json';
import type { Extension } from '@codemirror/state';

import type { EditorPreset } from './editor-types';

const PRESET_EXTENSIONS: Record<EditorPreset, () => Extension> = {
  json: () => json(),
};

export function resolvePresetExtension(preset: EditorPreset): Extension {
  const factory = PRESET_EXTENSIONS[preset];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive check for future presets
  if (!factory) throw new Error(`CodeEditor preset "${preset}" is not registered`);
  return factory();
}
