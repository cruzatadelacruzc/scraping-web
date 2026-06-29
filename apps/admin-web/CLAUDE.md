# Super Admin SPA — `apps/admin-web/`

React 18 + Vite 5 SPA that consumes the `bazaarsentinel` API (`src/main/`). Currently design-only: no code scaffolded yet. Two docs govern the future UI work — read both before touching anything.

@./DESIGN.md
@../../.claude/rules/admin-web-ui.md

## Status

This directory is in **design phase only**. There is no `package.json`, no `vite.config.ts`, no source code. The only deliverables so far are:

- `design.md` — the complete design system (mandatory reading before any UI work).
- `CLAUDE.md` — this file (auto-loaded when working in this directory).

When implementation starts, the recommended stack is:

- React 18 + Vite 5
- TanStack Query v5, TanStack Table v8
- shadcn/ui (Radix + Tailwind), Recharts, Tremor (optional)
- React Hook Form + Zod
- `sonner` for toasts
- MSW for offline dev (until the API gaps in the swagger are closed)

## Conventions

- All visual and behavioral rules are defined in `@./design.md`. Read it first.
- Folder layout (when code lands): `src/features/<module>/{components,hooks,schemas,index.ts}`.
- All API calls go through custom hooks. Components MUST NOT import from `@tanstack/react-query` or `axios`.
- This directory will eventually be wired into a monorepo with npm workspaces (`workspaces: ["apps/*"]` in the root `package.json`). Until then, treat it as an isolated folder.

## Related

- API spec: `swagger.json` at the repo root.
- Backend module pattern reference: `src/main/CLAUDE.md`.
- Design system audit: see the plan file under `~/.claude/plans/`.
