import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
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
  minHeight = '140px',
  resizable = false,
  ariaLabel,
  extensions = [],
  placeholder,
}: CodeEditorProps): JSX.Element {
  const resolvedExtensions = useMemo<Extension[]>(() => {
    const ext: Extension[] = [resolvePresetExtension(preset)];
    const lineWrap = getLineWrappingExtension();
    if (lineWrap) ext.push(lineWrap);
    if (ariaLabel) ext.push(EditorView.contentAttributes.of({ 'aria-label': ariaLabel }));
    ext.push(...extensions);
    return ext;
  }, [preset, ariaLabel, extensions]);

  // Dynamic pixel dimensions for a user-draggable container — not expressible as a utility class.
  const wrapperStyle: CSSProperties | undefined = resizable ? { height, minHeight } : undefined;

  return (
    <div
      className={`overflow-hidden rounded-sm border border-outline-variant${
        resizable ? ' resize-y' : ''
      }`}
      style={wrapperStyle}
    >
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={EDITOR_CONFIG.theme}
        height={resizable ? '100%' : height}
        className={resizable ? 'h-full' : undefined}
        basicSetup={BASIC_SETUP}
        style={codeMirrorStyle}
        extensions={resolvedExtensions}
        editable={!readOnly}
        placeholder={placeholder}
      />
    </div>
  );
}
