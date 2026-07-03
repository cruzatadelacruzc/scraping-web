---
description: 'Bot module compliance checks — Inversify DI, flow ordering, Prisma FK safety, ESM mocks. Run before committing changes under src/main/bots/.'
applyTo: 'src/main/bots/**'
---

# Bot Module — Compliance Rules

These rules apply to any change under `src/main/bots/`. For patterns and
recipes, see `.claude/skills/bots/SKILL.md`. General code standards are in
`.claude/rules/compliance-checklist.md`.

## DI bindings

- [ ] Every `@inject()` uses `TYPES.SymbolName`, never a bare class reference. Container binds Symbols — a class reference won't resolve.
- [ ] New classes are registered in BOTH `types.container.ts` (Symbol) AND `container.ts` (`.to(Class)`).

## Flows

- [ ] New slash-command flows are registered BEFORE `fallbackFlow` in `flows/index.ts`.
- [ ] No `{ sensitive: true }` on slash-command keywords — `\b` boundaries break `/` matching.
- [ ] Every flow calls `await resolveTenant(ctx, methods)` as its first action.
- [ ] Gated flows use `{ requireLinked: true }` + `withLinkedGuard()`. No manual try/catch for link checks.

## Data safety

- [ ] `accountId` in upsert/create is `null`, never `''`. Empty string violates the FK on `Account.id`.
- [ ] After any Prisma schema change, migration is created AND committed (`npx prisma migrate dev`).

## Tests

- [ ] New ESM dependency → `jest.mock` added to `src/__tests__/setupTests.ts`.
- [ ] New i18n key → parity test entry in `src/__tests__/unit/bots/lang.test.ts`.
