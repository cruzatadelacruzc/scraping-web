# Task 1 Report: Create ConditionMultiSelect component

## Status: DONE

## Files created
1. **`apps/admin-web/src/features/plans/components/condition-multi-select.tsx`** — new component with:
   - `ConditionMultiSelect` controlled component (Popover-based multi-select)
   - `ALL_CONDITIONS` exported constant (6 item Prisma AlarmConditionType enum)
   - Search filter with debounce-free live filtering
   - "Select all" / "Clear all" shortcut buttons
   - Removable chips below trigger showing selected conditions
   - Click-outside detection via `mousedown` listener on `document`
   - All four states handled: empty (no options), no selection (placeholder), selection (chips + count), filtered no results ("No conditions found")
   - Full accessibility: `role="listbox"`, `aria-multiselectable`, `aria-selected`, `aria-expanded`, `aria-haspopup`, `aria-label` on icon buttons

2. **`apps/admin-web/src/features/plans/index.ts`** — added barrel exports for `ConditionMultiSelect`, `ConditionMultiSelectProps` (type), and `ALL_CONDITIONS`

## Design decisions
- **No @radix-ui Popover dependency** — used a plain `div` with `absolute` positioning + `mousedown` click-outside detection, as specified in the brief
- **Raw `<input type="checkbox">`** — consistent with the existing plan-form-dialog.tsx pattern (no shadcn/Checkbox exists in the project)
- **`text-body-xs`** class used for chips and popover metadata text, matching the existing pattern in plans-table.tsx chips
- **`text-body-sm`** for option labels and trigger, matching the form's existing typography

## Verification
- `npm run typecheck -w apps/admin-web` → PASS
- `npm run lint -w apps/admin-web` → PASS (0 errors, 0 warnings)

## Lint notes
- Added `eslint-disable-next-line react-refresh/only-export-components` on the `ALL_CONDITIONS` export — intentional co-location per brief requirements (Task 2 reuse)
- Cast `value.length` to `String()` in template literal to satisfy `@typescript-eslint/restrict-template-expressions` (project config disallows bare numbers in templates)
