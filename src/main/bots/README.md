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
      ▼
createBot({ provider, extensions: { providerAdapter, tenantResolver, ... } })
      │  └─ dispatches to matching flow via keyword
      ▼
Flow action → resolveTenant(ctx, methods)
      │  └─ calls extensions.tenantResolver(from)
      │  └─ upserts BotConversation, resolves { accountId, userId, preferredLang }
      ▼
Route & respond
      ├─ /alarms, /subscription, /profile, /help, /status
      ├─ /link  (JWT deep-link account linking)
      ├─ /link-status, /unlink
      └─ free text → LangChain fallback
            └─ sessionId = tenant:<accountId>:user:<userId>:conv:<id>
```

## Layers

| Folder | Role |
|---|---|
| `controllers/` | REST endpoints for linking, status, unlinking, and audit history. `AuthMiddleware.forRoles('ACCOUNT_OWNER')`. |
| `services/` | `BotService` (one `createBot` per bot type), `TenantBotContextService` (tenant → ALS), `MessageRouterService` (command vs AI), `LinkCodeService` (JWT deep links + verification), `BotMenuService` (Telegram command menus + reply keyboards), `BotRateLimitService` (Redis-backed rate limiting). |
| `adapters/` | `IProviderAdapter` interface + `TelegramAdapter` (reply keyboard + `setMyCommands`) + `WhatsAppAdapter` (text-only). Injected via `extensions.providerAdapter`. |
| `flows/` | builderbot flows: `welcome`, `link-account`, `confirm-link`, `alarms`, `subscription`, `profile`, `help`, `status`, `fallback` (AI catch-all). |
| `providers/` | `provider-registry.ts` — single registry mapping bot types to provider classes. Selected via `BOT_<TYPE>_PROVIDER` env vars. |
| `repositories/` | `LinkCodeRepository`, `LinkAuditRepository`, `BotConversationRepository` (Prisma), `AiHistoryRepository` (Mongoose). |
| `errors/` | `InvalidLinkCodeError`, `UnlinkedUserError`, `ProviderNotReadyError`, `RateLimitError`. |
| `lang/` | Catalogs `en.ts` + `es.ts` with `t(lang, path)` helper. |
| `models/` | `AiHistoryModel` — Mongoose schema for LangChain history. |
| `types/` | `IBotContext`, `IFlowStatePayload` — shared types across services and flows. |
| `queues.ts` | `BotQueues` (`IQueueModule`) — `BOT_OUTBOUND_SEND` queue for outbound messages with backpressure. |
| `utils/` | `dns-ipv4.util.ts` — force IPv4 for provider hostnames when IPv6 is unreachable. |

## Account linking — JWT deep links

The linking mechanism uses a signed JWT token delivered as a deep link. The bot
never sees credentials — it only forwards the token to the backend for
verification.

### Flow

1. **Web UI** (`POST /api/bots/link-code`, requires `ACCOUNT_OWNER`) generates a
   JWT-signed link token and a provider-specific deep link.
2. **User clicks the deep link** (Telegram: `/start <token>`, WhatsApp: sends
   token as text). The bot forwards the raw token to the backend.
3. **Backend verifies** the JWT signature, checks the nonce (replay prevention),
   and links the conversation to the user.
4. **Gated commands** — the auth guard checks that the conversation has a linked
   `userId` before allowing access to `/alarms`, `/subscription`, etc.
   Unlinked users are prompted to link their account.

### Token properties

| Property | Value |
|---|---|
| Format | JWT (HS256), signed with `JWT_SECRET` |
| TTL | 5 minutes (configurable via `BOT_LINK_CODE_TTL_MINUTES`) |
| Payload | `{ sub, accountId, purpose: "bot-link", provider, jti }` |
| Validation | Self-validating via JWT signature + expiry. No DB lookup needed for verification. |
| Nonce | 16-char `nanoid` (`jti` claim). Tracked in Redis (SETNX) for replay prevention. Falls back to DB if Redis is down. |
| Deep link (Telegram) | `https://t.me/<bot>?start=<token>` |
| Deep link (WhatsApp) | `https://wa.me/<phone>?text=<token>` |

### Link lifetime

Links have a configurable 30-day lifetime (`BOT_LINK_LIFETIME_DAYS`), stored as
`linkExpiresAt` on the conversation. The link can be renewed by generating a new
deep link and clicking it. Use `/link-status` to see the current expiry date.

### Rate limiting

| Limit | Window | On exceed |
|---|---|---|
| 5 validation attempts per chat | 10 min | 30 min lock |
| 3 link-code generations per user | 10 min | Denied for remainder of window |

Enforced via Redis counters. Fail-open: if Redis is unreachable, rate limiting
is skipped rather than blocking linking.

### Audit trail

All link actions (`CODE_GENERATED`, `LINKED`, `UNLINKED`) are written to
`bot_link_audit`. Query via `GET /api/bots/link-history` (paginated, filterable
by action).

## How to run

1. **Environment variables** — copy `.env.example` and set the vars in the table
   below. Key combinations:
   - **Telegram**: `BOT_ENABLED=telegram` + `TELEGRAM_BOT_TOKEN=<token>` (get one from [@BotFather](https://t.me/BotFather))
   - **WhatsApp**: `BOT_ENABLED=whatsapp`
   - **Both**: `BOT_ENABLED=both` + `TELEGRAM_BOT_TOKEN=<token>`

2. **Start services**: `docker-compose up -d` (Postgres, Redis, Mongo).

3. **Start the server**: `npm run dev`.
   - **Telegram**: starts via long-polling — no extra steps.
   - **WhatsApp**: starts a QR-code server. Open `http://localhost:3001/`
     (or the configured `BOT_WHATSAPP_PORT`) and scan the QR from WhatsApp
     (Settings → Linked devices → Link a device). The page auto-refreshes.
     Alternatively, set `WHATSAPP_USE_PAIRING=true` + `WHATSAPP_PHONE_NUMBER`
     for a pairing notification (QR is more reliable).

4. **Test**: send `/help` to the bot from Telegram. If it replies, the bot is
   working. Link your account via the web UI: generate a deep link and click it
   (or paste the token to the bot on WhatsApp).

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
| `BOT_LINK_CODE_TTL_MINUTES` | `5` | JWT link token TTL in minutes (deep link expiration) |
| `BOT_LINK_LIFETIME_DAYS` | `30` | Days before a linked conversation's `linkExpiresAt` mark (advisory, stored on the record) |
| `BOT_OUTBOUND_CONCURRENCY` | `5` | Max concurrency for outbound sends |
| `TELEGRAM_BOT_USERNAME` | `BazaarSentinelBot` | Telegram bot username (used to build deep links) |

## Available commands

| Trigger | Flow | Auth | Response |
|---|---|---|---|
| _first message_ | `welcomeFlow` | none | Greeting, linking instructions, reply keyboard |
| `/alarms` | `alarmsFlow` | linked | Active alarms with current prices |
| `/subscription` | `subscriptionFlow` | linked | Plan and expiration date |
| `/profile` | `profileFlow` | linked | Display name and email |
| `/help` | `helpFlow` | none | Command list and linking instructions |
| `/status` | `statusFlow` | none | Bot online confirmation |
| _deep link click_ | `linkAccountFlow` | none | Receives JWT token via `/start <token>` (Telegram) or text (WhatsApp). Verifies and links the chat. |
| `/link-status` | `confirmLinkFlow` | linked | Current link expiry date |
| _free text_ | `fallbackFlow` | depends | Delegated to LangChain. Falls back to a generic error if no API key. |

Reply-keyboard buttons send their label as a text message. Unlinked users see
`/help`, `/status`, `/link`; linked users see `/alarms`, `/subscription`,
`/profile`, `/help`, `/status`, `/link-status`, `/unlink`. Linking is done via
deep link, not by typing a code.

## HTTP API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/bots/link-code` | `ACCOUNT_OWNER` | Generate a JWT link token + deep link. Body: `{ userId, provider? }`. Returns `{ links: { [provider]: { deepLink, expiresAt } }, ttlMinutes }`. Omit `provider` to generate for both. |
| `GET` | `/api/bots/status` | `ACCOUNT_OWNER` | Per-conversation status: `{ linked, provider, externalId (masked), preferredLang, lastActivity, linkExpiresAt }`. |
| `DELETE` | `/api/bots/link` | `ACCOUNT_OWNER` | Unlink all conversations for the authenticated user. Logs `UNLINKED` audit entries. |
| `GET` | `/api/bots/link-history` | `ACCOUNT_OWNER` | Paginated audit trail. Query: `?page, pageSize, action`. Returns `{ entries[], total, page, pageSize }`. |

## Multi-tenant isolation

Every inbound message is resolved and wrapped in the correct tenant:

```
resolveTenant(ctx, methods)
  1. Calls extensions.tenantResolver(from) — injected by BotService
  2. Upserts BotConversation by (provider, externalId)
  3. Returns { accountId, userId, preferredLang }
  4. Downstream code runs in runWithRequestContext({ tenantId, userId })
```

From that point on, all downstream code (services, repositories, Prisma
extension) inherits `tenantId` via `AsyncLocalStorage`. The Prisma extension
in `custom-prisma-client.ts` appends `accountId` automatically. MongoDB
(`bot_ai_history`) uses `sessionId` prefixing:
`tenant:<accountId>:user:<userId>:conv:<id>`.

## Provider system

Providers are resolved from a central registry (`providers/provider-registry.ts`)
at startup. The implementation class for each bot type is selected via
`BOT_<TYPE>_PROVIDER`:

```
getEnabledBotTypes()  →  ['whatsapp', 'telegram']
  → resolveProviderEntry('telegram')  →  BOT_TELEGRAM_PROVIDER=telegram  →  @builderbot-plugins/telegram
  → resolveProviderEntry('whatsapp')  →  BOT_WHATSAPP_PROVIDER=baileys   →  @builderbot/provider-baileys
```

**Adding a new provider** (e.g., Meta WhatsApp Cloud API):

1. Install the package.
2. Add an entry to the `REGISTRY` in `provider-registry.ts`.
3. Set the corresponding `BOT_<TYPE>_PROVIDER` env var.
4. Optionally implement an `IProviderAdapter` if the provider has different UX
   capabilities (e.g., interactive buttons).

## Telegram

Uses `@builderbot-plugins/telegram` (Telegraf). Reply keyboards and command
menus (`setMyCommands`) are sent via the raw Telegraf API because builderbot's
provider strips `reply_markup` from extra options. The `TelegramAdapter`
delegates to `BotMenuService`, which holds a direct Telegram API client.

Setup:
1. Create a bot with [@BotFather](https://t.me/BotFather) and get the token.
2. Add `TELEGRAM_BOT_TOKEN=<token>` to `.env`.
3. Set `BOT_ENABLED=telegram` (or `both`).

## WhatsApp

Uses `@builderbot/provider-baileys` (Baileys — WhatsApp Web). Baileys 7.x is
ESM-only; `baileys-preload.cjs` (loaded via `node -r`) patches `require.cache`
so the CJS builderbot provider receives the default export.

Currently **text-only** — the `WhatsAppAdapter` sends plain text without
buttons. Interactive messages require the WhatsApp Cloud API (Meta), which
can be added as a provider in the registry.

`baileys-preload.cjs` is loaded via `-r` in `npm run dev` and `npm run start`.
Remove the flag from `package.json` scripts if you drop WhatsApp support.

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
| Link audit | `repositories/link-audit.repository.ts` |
| Rate limiting | `services/rate-limit.service.ts` |
| Conversations | `repositories/bot-conversation.repository.ts` |
| AI history (Mongo) | `repositories/ai-history.repository.ts`, `models/ai-history.model.ts` |
| Outbound queue | `queues.ts` |
| HTTP endpoints | `controllers/bot.controller.ts` |
| DTOs | `services/dto/generate-link-code.dto.ts`, `services/dto/link-status.dto.ts`, `services/dto/confirm-link.dto.ts`, `services/dto/link-history.dto.ts` |
| i18n | `lang/en.ts`, `lang/es.ts`, `lang/index.ts` |
| Domain errors | `errors/*.error.ts` |
| builderbot flows | `flows/*.flow.ts`, `flows/shared/*.ts` |
| Tenant context + auth | `flows/shared/resolve-tenant.ts`, `flows/shared/auth.guard.ts` |
| Shared types | `types/bot-context.types.ts` |
| Barrel export | `index.ts` |
| ESM preload (CJS compat) | `baileys-preload.cjs` |
| IPv4 DNS helper | `utils/dns-ipv4.util.ts` |
| Prisma models | `prisma/schema.prisma` → `BotLinkCode`, `BotConversation` |
