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
            { extensions: { tenantResolver, providerAdapter, providerName, verifyAndLink, linkCodeService } })
```

- **One `createBot` per bot type** — never `createBot({ provider: null })`.
- **Provider registry** (`providers/provider-registry.ts`) — single source of truth. Adding a provider = adding an entry to `REGISTRY`, NOT a new DI class.
- **Provider adapters** (`adapters/`) — `TelegramAdapter`, `WhatsAppAdapter` implement `IProviderAdapter`. Flows consume `methods.extensions.providerAdapter`, never branch on provider name.
- **`BotMenuService`** — wraps raw Telegraf API for reply keyboards (`sendWithKeyboard`) and command menus (`applyCommands`). Needed because builderbot strips `reply_markup`. Singleton, injected into `TelegramAdapter` and `LinkCodeService`.
- **Extensions** — `BotService.start()` injects `tenantResolver`, `providerAdapter`, `providerName`, `verifyAndLink`, `linkCodeService`, `subscriptionProvider`, `alarmProvider`, `profileProvider`, and `aiHandler` into `extensions`. Flows access them via `methods.extensions.*`. To add one: service method → wire in `BotService.start()` → consume in flow.

### Extension Providers Reference

| Provider | Returns | Used by |
|---|---|---|
| `tenantResolver` | `IBotContext` (with `accountId`, `userId`, `preferredLang`) | All flows (via `resolveTenant`) |
| `providerAdapter` | `IProviderAdapter` | Flows that send rich messages |
| `providerName` | `'telegram' \| 'whatsapp'` | Flows that branch on provider |
| `verifyAndLink` | `Promise<boolean>` | `linkAccountFlow` |
| `linkCodeService` | `LinkCodeService` instance | `linkAccountFlow`, `confirmLinkFlow` |
| `subscriptionProvider` | `{ planName?, expiresAt? } \| null` | `/subscription` flow |
| `alarmProvider` | `Array<{ productName?, currentPrice? }>` | `/alarms` flow |
| `profileProvider` | `{ displayName?, email? } \| null` | `/profile` flow |
| `aiHandler` | `string` (graceful degradation message) | `fallbackFlow` |

All providers are fail-safe — they catch errors internally and return safe defaults (`null`, `[]`, or a fixed message) rather than throwing.

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

## Account Linking

Links a bot conversation (Telegram/WhatsApp chat) to a user account via a **one-time deep link** with a JWT-signed token. The bot is read-only: users verify their identity through the web app, not by typing codes into the chat.

### How it works

1. **Web app** calls `POST /api/link-code` -- `LinkCodeService.generate()` creates a HS256 JWT (5-min TTL, `purpose: 'bot-link'`), stores a tracking record in `BotLinkCode`, builds a platform-specific deep link, and logs an audit entry (`CODE_GENERATED`).
2. **User clicks deep link** -- `https://t.me/{BOT_USERNAME}?start={token}` (Telegram) or `https://wa.me/{PHONE}?text={token}` (WhatsApp). This opens the bot and triggers the `linkAccountFlow`.
3. **Bot verifies** -- `LinkCodeService.verifyAndLink()` validates the JWT signature and expiry (self-validating, no DB lookup), then checks the nonce (`jti`) for replay via Redis `SETNX` (falls back to DB `consumedAt` check if Redis is down). On success: links the conversation (`BotConversation.accountId`/`userId` set), sets `linkExpiresAt` (now + 30 days), marks the tracking record `CONSUMED`, applies bot menu commands, and logs `LINKED` to the audit trail.
4. **Periodic revalidation** -- on every gated command, `withLinkedGuard` calls `LinkCodeService.isLinkValid()` which checks `linkExpiresAt > now`. Expired links block the command. Users can renew via `POST /api/link-code` (re-extend) or check status via `/link-status`.

### Key services

| Service | Role |
|---|---|
| `LinkCodeService` | JWT generation, verification, link/unlink lifecycle, `isLinkValid()`, `renewLink()` |
| `BotRateLimitService` | Redis sliding-window: 5 validation attempts/chat/10min with 30min lock; 3 generations/user/10min. Fail-open (allows requests if Redis is down). |
| `LinkAuditRepository` | Append-only `BotLinkAudit` table (actions: `CODE_GENERATED`, `LINKED`, `UNLINKED`). |

### API endpoints

| Method | Path | Handler |
|---|---|---|
| `POST` | `/api/link-code` | `BotController.generateLinkCode` -- returns `{ token, deepLink, expiresIn }` |
| `GET` | `/api/link-code/status` | `BotController.getLinkStatus` -- returns `{ linked, provider, linkedAt, linkExpiresAt }` |
| `DELETE` | `/api/link-code` | `BotController.unlink` -- unlinks all bot conversations for the user |
| `GET` | `/api/link-code/history` | `BotController.getLinkHistory` -- paginated audit log |

### Flows involved

| Flow | Keyword(s) | Guard | Purpose |
|---|---|---|---|
| `linkAccountFlow` | `__LINK_CODE__`, `/start` | none (public entry) | Receives JWT token from deep link, calls `verifyAndLink` |
| `confirmLinkFlow` | `/link-status` | `withLinkedGuard` | Shows current link status and expiry |

### Env vars for linking

| Variable | Default | Purpose |
|---|---|---|
| `BOT_LINK_CODE_TTL_MINUTES` | `5` | JWT token expiry for deep links |
| `BOT_LINK_LIFETIME_DAYS` | `30` | How long a linked session lasts before revalidation required |
| `TELEGRAM_BOT_USERNAME` | `BazaarSentinelBot` | Used in `t.me/{username}?start=` deep links |

### Rate limiting

- **Validation**: per chat ID -- 5 attempts in 10 min; exceeding triggers a 30-min hard lock.
- **Generation**: per user ID -- 3 attempts in 10 min; no hard lock, just window rejection.
- **Fail-open**: all Redis errors return `{ allowed: true }`. Nonce replay falls back to DB check.
- Redis keys: `bot:ratelimit:count:validate:{chatId}`, `bot:ratelimit:lock:validate:{chatId}`, `bot:ratelimit:count:generate:{userId}`.

### Audit trail

`LinkAuditRepository.log()` writes to `BotLinkAudit` (Prisma) with:
- `action`: `CODE_GENERATED` | `LINKED` | `UNLINKED`
- `accountId`, `userId`, `code` (jti), `codeId`, `provider`, `externalId` (chatId), `ipAddress`, `userAgent`, `metadata`

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
| `TELEGRAM_BOT_USERNAME` | Used in `t.me/{username}?start=` deep links (default `BazaarSentinelBot`) |
| `BOT_TELEGRAM_PROVIDER` / `BOT_WHATSAPP_PROVIDER` | Select provider from registry |
| `BOT_LINK_CODE_TTL_MINUTES` | JWT token expiry for deep links (default 5) |
| `BOT_LINK_LIFETIME_DAYS` | Linked session lifetime before revalidation required (default 30) |

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
| Linking: generate token | `link-code.service.ts` (`generate()`) + `BotController.generateLinkCode` |
| Linking: verify in bot | `link-code.service.ts` (`verifyAndLink()`) + `link-account.flow.ts` |
| Linking: check status | `link-code.service.ts` (`isLinkValid()`) + `confirm-link.flow.ts` (`/link-status`) |
| Rate limiting | `rate-limit.service.ts` |
| Audit trail | `link-audit.repository.ts` |

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
| Direct DB query for link validity | Use `LinkCodeService.isLinkValid()` (checks `linkExpiresAt` on the linked conversation). |
| Skipping nonce check in custom verify | Always validate `jti` replay via `LinkCodeService.verifyAndLink()` -- it handles Redis SETNX + DB fallback. |
