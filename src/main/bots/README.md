# Bots — WhatsApp + Telegram

Multi-tenant bot that lets users manage alarms, subscriptions, and profile
from WhatsApp or Telegram. Built on builderbot + Baileys (WhatsApp) and
`@builderbot-plugins/telegram` (Telegraf). LangChain handles open-ended
questions with tenant-isolated context.

## Architecture

```
WhatsApp / Telegram
      │
      ▼
builderbot ProviderClass (resolveProviderEntry + createProvider)
      │  └─ provider class selected via BOT_<TYPE>_PROVIDER env var
      │  └─ emits 'message' event with { body, from }
      │
      ▼
createBot({ provider, extensions: { providerAdapter, tenantResolver, ... } })
      │  └─ dispatches to matching flow via keyword
      │
      ▼
Flow action → resolveTenant(ctx, methods)
      │  └─ calls extensions.tenantResolver(from)
      │  └─ upserts BotConversation, resolves { accountId, userId, preferredLang }
      │
      ▼
Route & respond
      │
      ├─ /alarms, /subscription, /profile, /help, /status
      ├─ /link  (code-based account linking)
      ├─ /unlink
      │
      └─ free text → LangChain fallback
            └─ sessionId = tenant:<accountId>:user:<userId>:conv:<id>
```

## Layers

| Folder | Role |
|---|---|
| `controllers/` | `POST /api/bots/link-code`, `GET /api/bots/status`, `DELETE /api/bots/link`. `AuthMiddleware.forRoles('ACCOUNT_OWNER')`. |
| `services/` | `BotService` (one `createBot` per bot type), `TenantBotContextService` (tenant → ALS), `MessageRouterService` (command vs AI), `LinkCodeService` (6-char codes), `BotMenuService` (Telegram command menus + reply keyboards). |
| `adapters/` | `IProviderAdapter` interface + `TelegramAdapter` (reply keyboard + `setMyCommands`) + `WhatsAppAdapter` (text-only). Injected via `extensions.providerAdapter`. |
| `flows/` | builderbot flows: `welcome`, `link-account`, `alarms`, `subscription`, `profile`, `help`, `status`, `fallback` (AI catch-all). |
| `providers/` | `provider-registry.ts` — single registry mapping bot types to provider classes. Selected via `BOT_<TYPE>_PROVIDER` env vars. |
| `repositories/` | `LinkCodeRepository`, `BotConversationRepository` (Prisma), `AiHistoryRepository` (Mongoose). |
| `errors/` | `InvalidLinkCodeError`, `UnlinkedUserError`, `ProviderNotReadyError`, `RateLimitError`. |
| `lang/` | Catalogs `en.ts` + `es.ts` with `t(lang, path)` helper. |
| `models/` | `AiHistoryModel` — Mongoose schema for LangChain history. |
| `types/` | `IBotContext`, `IFlowStatePayload` — shared types across services and flows. |
| `queues.ts` | `BotQueues` (`IQueueModule`) — `BOT_OUTBOUND_SEND` queue for outbound messages with backpressure. |
| `utils/` | `dns-ipv4.util.ts` — force IPv4 for provider hostnames when IPv6 is unreachable. |

## Account linking (link code)

1. **Web UI** — `POST /api/bots/link-code` (authenticated) generates a 6-character
   code (`nanoid(6)`) with configurable TTL (`BOT_LINK_CODE_TTL_MINUTES`,
   default 10 min). Persisted in `bot_link_codes`.
2. **User sends the code to the bot** — the `linkAccountFlow` captures it and
   calls `LinkCodeService.validate(code)`. If the code exists, hasn't expired,
   and hasn't been consumed, it is marked as `consumedAt = now`.
3. **Conversation is linked** — `BotConversationRepository.linkUser(id, userId)`
   sets the `userId` on the `bot_conversations` record. The bot's command menu
   and reply keyboard update to show the full set of linked-user commands.

## How to run

1. **Environment variables** — copy `.env.example` and set the vars listed in the
   table below.

   - **Telegram**: `BOT_ENABLED=telegram` + `TELEGRAM_BOT_TOKEN=<token>` (get one from [@BotFather](https://t.me/BotFather))
   - **WhatsApp**: `BOT_ENABLED=whatsapp`
   - **Both**: `BOT_ENABLED=both` + `TELEGRAM_BOT_TOKEN=<token>`

2. **Start services**:
   ```bash
   docker-compose up -d          # Postgres, Redis, Mongo
   ```

3. **Start the server**:
   ```bash
   npm run dev
   ```
   - **Telegram**: the bot starts via long-polling — no extra steps needed.
   - **WhatsApp**: the bot starts a QR-code server. Open `http://localhost:3001/`
     (or the configured `BOT_WHATSAPP_PORT`) and scan the QR with WhatsApp
     (Settings → Linked devices → Link a device). The page auto-refreshes.
     Alternatively, set `WHATSAPP_USE_PAIRING=true` + `WHATSAPP_PHONE_NUMBER`
     to receive a pairing notification (experimental — QR is more reliable).

4. **Test** — send `/help` to the bot from Telegram. If it replies with the
   command list, the bot is working. To link your account, generate a code from
   the web UI and send it to the chat.

## Environment variables

| Variable | Default | Controls |
|---|---|---|
| `BOT_ENABLED` | `none` | `whatsapp`, `telegram`, `both`, `none` (comma-separated) |
| `BOT_TELEGRAM_PROVIDER` | `telegram` | Provider implementation for Telegram (`telegram`) |
| `BOT_WHATSAPP_PROVIDER` | `baileys` | Provider implementation for WhatsApp (`baileys`) |
| `BOT_HTTP_PORT` | `3001` | Base port for bot HTTP servers (each bot type = base + index) |
| `BOT_TELEGRAM_PORT` | — | Override port for Telegram bot (takes precedence over base + index) |
| `BOT_WHATSAPP_PORT` | — | Override port for WhatsApp bot |
| `WHATSAPP_SESSION_NAME` | `price-monitor-bot` | Baileys session folder (persists auth under `./<name>_sessions`) |
| `WHATSAPP_USE_PAIRING` | `false` | Use pairing notification instead of QR. Has a timing bug in the provider. |
| `WHATSAPP_PHONE_NUMBER` | — | Phone with country code, required only if `WHATSAPP_USE_PAIRING=true` |
| `TELEGRAM_BOT_TOKEN` | — | Telegram bot token (required when `BOT_ENABLED` includes `telegram`) |
| `BOT_FORCE_IPV4` | — | Comma-separated provider hostnames to force IPv4 (`telegram`, `whatsapp`) |
| `WEB_APP_BASE_URL` | `http://localhost:3000` | Base URL for deep-links in welcome messages |
| `OPENAI_API_KEY` | — | OpenAI API key for LangChain (optional in dev) |
| `MONGODB_BOT_HISTORY_COLL` | `bot_ai_history` | MongoDB collection for LangChain history |
| `BOT_LINK_CODE_TTL_MINUTES` | `10` | Link-code validity in minutes |
| `BOT_OUTBOUND_CONCURRENCY` | `5` | Max concurrency for outbound sends |

## Available commands

| Trigger | Flow | Auth | Response |
|---|---|---|---|
| _first message_ | `welcomeFlow` | none | Greeting + linking instructions + reply keyboard |
| `/alarms` | `alarmsFlow` | linked | Active alarms with current price |
| `/subscription` | `subscriptionFlow` | linked | Plan and expiration date |
| `/profile` | `profileFlow` | linked | Display name and email of the linked user |
| `/help` | `helpFlow` | none | Command list + linking instructions |
| `/status` | `statusFlow` | none | Bot online confirmation |
| _6-char code_ | `linkAccountFlow` | none | Validates, consumes, and links the code to this chat |
| _free text_ | `fallbackFlow` | depends | Delegated to LangChain (AI). Falls back to a generic error if no API key. |

Reply-keyboard buttons (`/help`, `/status`, `/link` for unlinked users;
`/alarms`, `/subscription`, `/profile`, `/help`, `/status`, `/unlink` for
linked users) send their label as a text message. `/link` and `/unlink`
currently fall through to the AI fallback — dedicated flows for them are
pending.

## HTTP API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/bots/link-code` | `ACCOUNT_OWNER` | Generates a 6-char code. Returns `{ code, expiresAt }`. |
| `GET` | `/api/bots/status` | `ACCOUNT_OWNER` | Returns `{ linked, provider, preferredLang }`. |
| `DELETE` | `/api/bots/link` | `ACCOUNT_OWNER` | Unlinks all conversations for the authenticated user. |

## Multi-tenant isolation

Every inbound message is resolved and wrapped in the correct tenant:

```
resolveTenant(ctx, methods)
  1. Calls extensions.tenantResolver(from) — injected by BotService
  2. Upserts BotConversation by (provider, externalId)
  3. Returns { accountId, userId, preferredLang }
  4. Downstream work runs in runWithRequestContext({ tenantId, userId })
```

From that point on, **all downstream code** (services, repositories,
Prisma extension) inherits the `tenantId` via `AsyncLocalStorage`. The
Prisma extension in `custom-prisma-client.ts` intercepts every query and
appends `accountId` automatically. For MongoDB (`bot_ai_history`),
isolation is enforced by prefixing `sessionId`:
`tenant:<accountId>:user:<userId>:conv:<id>`.

## Provider system

Providers are resolved from a central registry (`providers/provider-registry.ts`)
at startup. The concrete implementation class for each bot type is selected via
the `BOT_<TYPE>_PROVIDER` env var:

```
getEnabledBotTypes()  →  ['whatsapp', 'telegram']
  → resolveProviderEntry('telegram')  →  BOT_TELEGRAM_PROVIDER=telegram  →  @builderbot-plugins/telegram
  → resolveProviderEntry('whatsapp')  →  BOT_WHATSAPP_PROVIDER=baileys   →  @builderbot/provider-baileys
```

**Adding a new provider** (e.g., Meta WhatsApp Cloud API):

1. Install the package.
2. Add an entry to the `REGISTRY` in `provider-registry.ts`:
   ```typescript
   whatsapp: {
     baileys: { ... },
     meta: {
       Provider: MetaProvider,
       buildConfig: () => ({ token: process.env.META_API_TOKEN }),
     },
   },
   ```
3. Set `BOT_WHATSAPP_PROVIDER=meta` in `.env`.
4. Optionally implement a new `IProviderAdapter` if the provider has different
   UX capabilities (e.g., interactive buttons).

## Telegram

Uses `@builderbot-plugins/telegram` (Telegraf). Reply keyboard and command
menu (`setMyCommands`) are sent via the raw Telegraf API because builderbot's
provider strips `reply_markup` from extra options. The `TelegramAdapter`
delegates to `BotMenuService`, which holds a direct `Telegram` API client.

To set up:
1. Create a bot with [@BotFather](https://t.me/BotFather) and get the token.
2. Add `TELEGRAM_BOT_TOKEN=<token>` to `.env`.
3. Set `BOT_ENABLED=telegram` (or `both`).

## WhatsApp

Uses `@builderbot/provider-baileys` (Baileys — WhatsApp Web). Baileys 7.x is
ESM-only; the `baileys-preload.cjs` script (loaded via `node -r`) patches the
`require.cache` so the CJS builderbot provider receives the callable default
export instead of the module namespace.

Currently **text-only** — the `WhatsAppAdapter` sends plain text without
buttons. Interactive messages require the WhatsApp Cloud API (Meta), which
can be added as a new provider entry in the registry.

**ESM preload:** `baileys-preload.cjs` is loaded at startup via the `-r` flag
in both `npm run dev` and `npm run start`. If you remove WhatsApp support, you
can remove the `-r ./baileys-preload.cjs` flag from `package.json` scripts.

## File reference

| Topic | File |
|---|---|
| Main orchestrator | `services/bot.service.ts` |
| Provider registry | `providers/provider-registry.ts` |
| Provider adapters | `adapters/provider-adapter.interface.ts`, `adapters/telegram-adapter.service.ts`, `adapters/whatsapp-adapter.service.ts` |
| Telegram menu + keyboard | `services/bot-menu.service.ts` |
| Tenant resolution → ALS | `services/tenant-bot-context.service.ts` |
| Command vs AI router | `services/message-router.service.ts` |
| Link codes | `services/link-code.service.ts`, `repositories/link-code.repository.ts` |
| Conversations | `repositories/bot-conversation.repository.ts` |
| AI history (Mongo) | `repositories/ai-history.repository.ts`, `models/ai-history.model.ts` |
| Outbound queue | `queues.ts` |
| HTTP endpoints | `controllers/bot.controller.ts` |
| DTOs | `services/dto/generate-link-code.dto.ts`, `services/dto/link-status.dto.ts` |
| i18n | `lang/en.ts`, `lang/es.ts`, `lang/index.ts` |
| Domain errors | `errors/*.error.ts` |
| builderbot flows | `flows/*.flow.ts`, `flows/shared/*.ts` |
| Tenant context + auth | `flows/shared/resolve-tenant.ts`, `flows/shared/auth.guard.ts` |
| Shared types | `types/bot-context.types.ts` |
| Barrel export | `index.ts` |
| ESM preload (CJS compat) | `baileys-preload.cjs` |
| IPv4 DNS helper | `utils/dns-ipv4.util.ts` |
| Prisma models | `prisma/schema.prisma` → `BotLinkCode`, `BotConversation` |
