---
name: bots
description: Use when adding features, flows, providers, or fixing bugs under src/main/bots/ — covers the multi-provider architecture, flow patterns, ESM mock requirements, and anti-patterns that are not discoverable from reading the code alone.
---

# Bots Module — Agent Recipe

Multi-tenant WhatsApp + Telegram bot module. builderbot with Baileys (WhatsApp)
and `@builderbot-plugins/telegram` (Telegraf). One `createBot` per enabled bot type;
providers resolved from a central registry.

**REQUIRED BACKGROUND:** `.claude/skills/security/SKILL.md` (ALS tenant context, Prisma extensions).

## Architecture (what you must NOT break)

```
BOT_ENABLED=both → getEnabledBotTypes() → for each botType:
  entry = resolveProviderEntry(botType)   // registry + BOT_<TYPE>_PROVIDER env
  provider = createProvider(entry.Provider, entry.buildConfig())
  createBot({ flow: mainFlow, provider, database },
            { extensions: { tenantResolver, providerAdapter, validateAndLink } })
```

- **One `createBot` per bot type** — never `createBot({ provider: null })`.
- **Provider registry** (`providers/provider-registry.ts`) — single source of truth. Adding a provider = adding an entry to `REGISTRY`, NOT a new DI class.
- **Provider adapters** (`adapters/`) — `TelegramAdapter`, `WhatsAppAdapter` implement `IProviderAdapter`. Flows consume `methods.extensions.providerAdapter`, never branch on provider name.
- **`BotMenuService`** — wraps raw Telegraf API for reply keyboards (`sendWithKeyboard`) and command menus (`applyCommands`). Needed because builderbot strips `reply_markup`. Singleton, injected into `TelegramAdapter` and `LinkCodeService`.
- **Extensions** — `BotService.start()` injects `tenantResolver`, `providerAdapter`, `validateAndLink` into `extensions`. Flows access them via `methods.extensions.*`. To add one: service method → wire in `BotService.start()` → consume in flow.

## Adding a new flow

1. Create `flows/<name>.flow.ts`:
```typescript
import { addKeyword } from '@builderbot/bot';
import { resolveTenant } from './shared/resolve-tenant';
import { t } from '@bots/lang';

export const myFlow = addKeyword(['/mycommand'])
  .addAction(async (ctx, methods) => {
    const botCtx = await resolveTenant(ctx, methods);
    const lang = botCtx.preferredLang;
    await methods.flowDynamic(t(lang, 'myKey.response'));
    return methods.endFlow();
  });
```

2. Register in `flows/index.ts` → add to `mainFlow` BEFORE `fallbackFlow`.
3. Add i18n keys to `lang/en.ts` and `lang/es.ts`.
4. Add parity test in `src/__tests__/unit/bots/lang.test.ts`.

**Rules:**
- First action: ALWAYS `await resolveTenant(ctx, methods)`.
- Gated flows (require linked user): pass `{ requireLinked: true }` + wrap callback with `withLinkedGuard()` from `flows/shared/auth.guard.ts`. Never manual try/catch.
- Do NOT use `{ sensitive: true }` on slash-command keywords — `\b` boundaries break `/` matching.
- Use `methods.flowDynamic()`, `methods.endFlow()`. Never `ctxFn.*` or `ctxFn.state`.
- **fallbackFlow:** it uses `EVENTS.WELCOME` (fires only on first message). Unknown slash commands silently return — no "command not found" response. Known limitation.

## Adding a new provider

1. Add entry to `REGISTRY` in `providers/provider-registry.ts`.
2. Users select via `.env`: `BOT_WHATSAPP_PROVIDER=meta`.
3. If the provider needs a different adapter, implement `IProviderAdapter` in `adapters/`, register in DI (`types.container.ts` + `container.ts`), update `BotService._resolveAdapter()`.
4. If ESM-only, add `jest.mock` in `src/__tests__/setupTests.ts`.

## DI rules

Every `@inject()` in the bots module MUST use `TYPES.SymbolName`, never the class reference:
```typescript
// ✅ Correct
@inject(TYPES.BotConversationRepository) private readonly _repo: BotConversationRepository

// ❌ Wrong — Inversify won't resolve it
@inject(BotConversationRepository) private readonly _repo: BotConversationRepository
```

## Configuration

All bot env vars are documented in `.env.example` (lines 33-82). Key ones:

| Variable | Purpose |
|---|---|
| `BOT_ENABLED` | `whatsapp`, `telegram`, `both`, `none` |
| `TELEGRAM_BOT_TOKEN` | Required for Telegram |
| `BOT_TELEGRAM_PROVIDER` / `BOT_WHATSAPP_PROVIDER` | Select provider from registry |

After schema changes, run `npx prisma migrate dev` and commit the migration.

## ESM interop

`baileys-preload.cjs` at project root is loaded via `node -r` (in `dev`/`start` scripts).
It patches `require.cache` so baileys 7.x (ESM-only) works with `require()` in CJS.
`TypeError: makeWASocketOther is not a function` → preload not running.

## ESM mocks

`src/__tests__/setupTests.ts` must mock ESM packages globally:
```typescript
jest.mock('@builderbot-plugins/telegram', () => ({ TelegramProvider: jest.fn() }));
jest.mock('@builderbot/provider-baileys', () => ({ BaileysProvider: jest.fn() }));
```
Without these: `Class extends value undefined is not a constructor or null`.

For general Jest patterns (ALS mocks, Prisma mocks, TDD workflow), see `.claude/skills/testing/SKILL.md`.

## Debugging

Builderbot writes three log files to the project root:

| File | What to look for |
|---|---|
| `core.class.log` | `[handleMsg]` — was the message received? What `body` and `from`? |
| `queue.class.log` | `QUEUE → EXECUTING → SUCCESS` per message. If SUCCESS but no response → callback threw before `flowDynamic()`. |
| `baileys.log` | WhatsApp connection/auth errors. |

**Silent-failure pattern:** callback runs (`SUCCESS`) but no follow-up message. Causes:
1. `resolveTenant` throws — check `accountId: null` (not `''` — empty string violates FK).
2. Missing migration — `accountId` must be nullable. Run `npx prisma migrate dev`.
3. `tenantResolver` extension missing — `BotService.start()` didn't wire it.

## Quick reference

| Task | File(s) |
|---|---|
| New slash command | `flows/<name>.flow.ts` + `flows/index.ts` + `lang/en.ts` + `lang/es.ts` |
| New provider | `providers/provider-registry.ts` |
| New adapter | `adapters/<name>-adapter.service.ts` + DI + `BotService._resolveAdapter()` |
| New extension | service method + `BotService.start()` + flow consumer |
| Telegram keyboards | `bot-menu.service.ts` |
| New i18n key | `lang/en.ts` + `lang/es.ts` (+ parity test) |
| ESM mock | `src/__tests__/setupTests.ts` |
| Schema change | `prisma migrate dev` → commit migration |

## Common mistakes

| Mistake | Fix |
|---|---|
| `@inject(ClassName)` | Use `@inject(TYPES.ClassName)` — all bot bindings use Symbols. |
| `accountId: ''` in upsert | Use `null`. Empty string violates FK on `Account.id`. |
| `{ sensitive: true }` on `/` commands | `\b` boundaries break `/` matching. Don't use it. |
| Flow after `fallbackFlow` in index | Register commands before the catch-all. |
| Missing ESM mock in setupTests | Add `jest.mock` for ESM packages. |
| Adding provider as DI class | Add to `REGISTRY` in `provider-registry.ts` instead. |
| `ctxFn.state.get('botCtx')` | Use `await resolveTenant(ctx, methods)`. |
| Manual try/catch for link checks | Use `{ requireLinked: true }` + `withLinkedGuard()`. |
