# Task 1 Report: Extract shared/ui/code-editor/ module

## Status: DONE

## Commits
- `dae1c109c1e95c95933281e3261cefdb380e7c4c`

## Test Summary
All checks pass: typecheck (tsc --noEmit), lint (0 errors, 0 warnings), and 6/6 vitest tests for the code-editor module.

## Self-review
- All 6 files created exactly as specified in the task brief under `apps/admin-web/src/shared/ui/code-editor/`.
- **editor-config.ts**: Removed unnecessary `as 'light' | 'dark'` type assertion per `@typescript-eslint/no-unnecessary-type-assertion`. The ternary expression already narrows the type correctly.
- **editor-presets.ts**: Added `eslint-disable-next-line @typescript-eslint/no-unnecessary-condition` for the `if (!factory)` guard -- the check is always falsy for the current single-member union (`'json'`), but serves as a defensive guard for future preset additions.
- **CodeEditor.tsx**: Extracted inline `style={{ fontSize: ... }}` object to a module-level constant `codeMirrorStyle` to satisfy `react-perf/jsx-no-new-object-as-prop`.
- **__tests__/CodeEditor.test.tsx**: Mocks `@uiw/react-codemirror` (CodeMirror requires DOM APIs not available in jsdom). Covers 6 cases: renders with value, readOnly mode, editable mode, placeholder, onChange callback, and renders without error.
- No files outside the code-editor directory were modified.
