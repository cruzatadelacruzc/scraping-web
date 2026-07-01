---
name: bots
description: Use when adding features, flows, providers, or fixing bugs under src/main/bots/ — covers the multi-provider architecture, flow patterns, ESM mock requirements, and anti-patterns that are not discoverable from reading the code alone.
---

# Bots Module — Agent Reference

Multi-tenant WhatsApp + Telegram bot module. builderbot with Baileys (WhatsApp)
and `@builderbot-plugins/telegram` (Telegraf). One `createBot` instance per
enabled provider; tenant context injected via `extensions.tenantResolver`.

**REQUIRED BACKGROUND:** Project security patterns (ALS tenant context, Prisma
extensions). See `.claude/skills/security/SKILL.md`.

## Architecture

```
BOT_ENABLED=both
  → createBot({ flow: mainFlow, provider: createProvider(BaileysProvider, { name }), database }, { extensions: { tenantResolver } })
  → createBot({ flow: mainFlow, provider: createProvider(TelegramProvider, { token }), database }, { extensions: { tenantResolver } })
```

**One `createBot` per provider.** Each bot instance gets the same flows but
its own transport. builderbot handles message dispatch and `flowDynamic()`
natively. Never use `createBot({ provider: null })` — flows would have no
transport for responses.

Tenant context flows through `extensions.tenantResolver(from)` → every flow
calls `resolveTenant(ctx, methods)` as its first action.

## Adding a new flow

1. Create `flows/<name>.flow.ts`:
```typescript
import { addKeyword } from '@builderbot/bot';
import { resolveTenant } from './shared/resolve-tenant';
import { t } from '@bots/lang';

export const myFlow = addKeyword(['/mycommand'], { sensitive: true })
  .addAction(async (ctx, methods) => {
    const botCtx = await resolveTenant(ctx, methods);
    const lang = botCtx.preferredLang;
    // ... business logic via methods.extensions.* ...
    await methods.flowDynamic(t(lang, 'myKey.response'));
    return methods.endFlow();
  });
```

2. Register in `flows/index.ts` → add to `mainFlow` array BEFORE `fallbackFlow`.
3. Add i18n keys to `lang/en.ts` and `lang/es.ts`.
4. Add parity test entry in `src/__tests__/unit/bots/lang.test.ts`.

**Rules:**
- First action is ALWAYS `await resolveTenant(ctx, methods)`.
- Use `methods.flowDynamic()`, `methods.endFlow()` — never `ctxFn.*`.
- Access providers/data via `methods.extensions` — never `ctxFn.state.get(...)`.
- Do NOT import `BotContext` or `BotMethods` from `@builderbot/bot` — they are
  not exported. Let `addAction` infer the parameter types.

## Adding a new provider

1. Implement `IBotProvider` from `providers/ibot-provider.interface.ts`:
   - `name: string` — provider identifier for logging.
   - `createProviderInstance(): ProviderClass` — wraps `createProvider(...)`.
2. Register in `shared/types.container.ts` (Symbol) and `shared/container.ts` (binding).
3. Inject into `BotService` and add to the factory list in `start()`.

## ESM mocks (critical for tests)

`@builderbot-plugins/telegram` and `@builderbot/provider-baileys` are ESM
packages. Jest requires a global mock in `src/__tests__/setupTests.ts`:

```typescript
jest.mock('@builderbot-plugins/telegram', () => ({ TelegramProvider: jest.fn() }));
jest.mock('@builderbot/provider-baileys', () => ({ BaileysProvider: jest.fn() }));
```

Without these, tests fail with `Class extends value undefined is not a constructor or null`.

## Quick reference

| Task | File(s) |
|---|---|
| New slash command | `flows/<name>.flow.ts` + `flows/index.ts` + `lang/en.ts` + `lang/es.ts` |
| New provider | `providers/<name>/<name>.provider.ts` + `types.container.ts` + `container.ts` + `bot.service.ts` |
| New i18n key | `lang/en.ts` + `lang/es.ts` (+ parity test) |
| ESM mock | `src/__tests__/setupTests.ts` |
| Outbound message | enqueue to `BOT_OUTBOUND_SEND` (stub — wired when provider.reply lands) |

## Common mistakes

| Mistake | Fix |
|---|---|
| `createBot({ provider: null })` | One `createBot` per enabled provider, each with a real `ProviderClass`. |
| `ctxFn.state.get('botCtx')` | Use `await resolveTenant(ctx, methods)`. |
| `import { BotContext } from '@builderbot/bot'` | Not exported. Let `addAction` infer types. |
| Missing ESM mock in setupTests | Add `jest.mock` for the new ESM dependency. |
| Flow registered after `fallbackFlow` | `fallbackFlow` is the catch-all — register command flows before it. |
