import { useMemo } from 'react';
import type { Extension } from '@codemirror/state';
import CodeMirror from '@uiw/react-codemirror';

import { BASIC_SETUP, EDITOR_CONFIG, getLineWrappingExtension } from './editor-config';
import { resolvePresetExtension } from './editor-presets';
import type { CodeEditorProps } from './editor-types';

const codeMirrorStyle = { fontSize: `${String(EDITOR_CONFIG.fontSize)}px` };

export function CodeEditor({
  preset,
  value,
  onChange,
  readOnly = false,
  height = '200px',
  extensions = [],
  placeholder,
}: CodeEditorProps): JSX.Element {
  const resolvedExtensions = useMemo<Extension[]>(() => {
    const ext: Extension[] = [resolvePresetExtension(preset)];
    const lineWrap = getLineWrappingExtension();
    if (lineWrap) ext.push(lineWrap);
    ext.push(...extensions);
    return ext;
  }, [preset, extensions]);

  return (
    <div className="overflow-hidden rounded-sm border border-outline-variant">
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={EDITOR_CONFIG.theme}
        height={height}
        basicSetup={BASIC_SETUP}
        style={codeMirrorStyle}
        extensions={resolvedExtensions}
        editable={!readOnly}
        placeholder={placeholder}
      />
    </div>
  );
}
