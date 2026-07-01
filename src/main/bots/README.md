# Bots — WhatsApp + Telegram

Multi-tenant bot that lets users manage alarms, subscriptions, and profile
from WhatsApp or Telegram. Built on builderbot + Baileys (WhatsApp) and
`@builderbot-plugins/telegram` (Telegraf). LangChain handles open-ended
questions with tenant-isolated context.

## Flow

```
WhatsApp / Telegram
      │
      ▼
builderbot ProviderClass (Baileys | Telegram)
      │  └─ emits 'message' event with { body, from }
      │
      ▼
createBot({ provider, extensions: { tenantResolver } })
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
      ├─ /alarms, /subscription, /profile, /help, /start
      │
      └─ free text → LangChain fallback
            └─ sessionId = tenant:<accountId>:user:<userId>:conv:<id>
```

## Layers

| Folder | Role |
|---|---|
| `controllers/` | `POST /api/bots/link-code`, `GET /api/bots/status`, `DELETE /api/bots/link`. `AuthMiddleware.forRoles('ACCOUNT_OWNER')`. |
| `services/` | `BotService` (one `createBot` per provider), `TenantBotContextService` (tenant → ALS), `MessageRouterService` (command vs AI), `LinkCodeService` (6-char codes), `I18nService` (preferred language). |
| `flows/` | builderbot flows: `welcome`, `link-account`, `alarms`, `subscription`, `profile`, `help`, `fallback` (AI catch-all). |
| `providers/` | `IBotProvider` interface + `WhatsAppProvider` (Baileys) + `TelegramProvider` (`@builderbot-plugins/telegram`). |
| `repositories/` | `LinkCodeRepository`, `BotConversationRepository` (Prisma), `AiHistoryRepository` (Mongoose). |
| `errors/` | `InvalidLinkCodeError`, `UnlinkedUserError`, `ProviderNotReadyError`, `RateLimitError`. |
| `lang/` | Catalogs `en.ts` + `es.ts` with `t(lang, path)` helper. |
| `models/` | `AiHistoryModel` — Mongoose schema for LangChain history. |
| `types/` | `IBotContext`, `IFlowStatePayload` — shared types across services and flows. |
| `queues.ts` | `BotQueues` (`IQueueModule`) — `BOT_OUTBOUND_SEND` queue for outbound messages with backpressure. |

## Account linking (link code)

1. **Web UI** — `POST /api/bots/link-code` (authenticated) generates a 6-character
   code (`nanoid(6)`) with configurable TTL (`BOT_LINK_CODE_TTL_MINUTES`,
   default 10 min). Persisted in `bot_link_codes`.
2. **User sends the code to the bot** — the `linkAccountFlow` captures it and
   calls `LinkCodeService.validate(code)`. If the code exists, hasn't expired,
   and hasn't been consumed, it is marked as `consumedAt = now`.
3. **Conversation is linked** — `BotConversationRepository.linkUser(id, userId)`
   sets the `userId` on the `bot_conversations` record.

## How to run

1. **Environment variables** — copy `.env.example` and set the vars listed in the
   table below.

   - **WhatsApp**: `BOT_ENABLED=whatsapp`
   - **Telegram**: `BOT_ENABLED=telegram` + `TELEGRAM_BOT_TOKEN=<token>` (get one from [@BotFather](https://t.me/BotFather))
   - **Both**: `BOT_ENABLED=both` + `TELEGRAM_BOT_TOKEN=<token>`

2. **Start services**:
   ```bash
   docker-compose up -d          # Postgres, Redis, Mongo
   ```

3. **Start the server**:
   ```bash
   npm run dev
   ```
   - **WhatsApp**: the console prints a **QR code**. Scan it with WhatsApp
     (Settings → Linked devices → Link a device).
   - **Telegram**: the bot starts via long-polling — no extra steps needed.

4. **Test** — send `/help` to the bot from WhatsApp or Telegram. If it replies,
   the bot is working. To link your account, generate a code from the web UI
   and send it to the chat.

## Environment variables

| Variable | Default | Controls |
|---|---|---|
| `BOT_ENABLED` | `none` | `whatsapp`, `telegram`, `both`, `none` |
| `WHATSAPP_SESSION_NAME` | `price-monitor-bot` | Baileys session folder (persists auth) |
| `TELEGRAM_BOT_TOKEN` | — | Telegram bot token (required when `BOT_ENABLED` includes `telegram`) |
| `WEB_APP_BASE_URL` | `http://localhost:3000` | Base URL for deep-links in welcome messages |
| `OPENAI_API_KEY` | — | OpenAI API key for LangChain (optional in dev) |
| `MONGODB_BOT_HISTORY_COLL` | `bot_ai_history` | MongoDB collection for LangChain history |
| `BOT_LINK_CODE_TTL_MINUTES` | `10` | Link-code validity in minutes |
| `BOT_OUTBOUND_CONCURRENCY` | `5` | Max concurrency for outbound sends |

## Available commands

| Command | Flow | Response |
|---|---|---|
| `/start` | `welcomeFlow` | Greeting + linking instructions (if not linked) |
| `/alarms` | `alarmsFlow` | Active alarms with current price (requires linking) |
| `/subscription` | `subscriptionFlow` | Plan and expiration date (requires linking) |
| `/profile` | `profileFlow` | Display name and email of the linked user |
| `/help` | `helpFlow` | Command list + linking instructions |
| _free text_ | `fallbackFlow` | Delegated to LangChain (AI). Falls back to a generic error if no API key. |

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
  4. BotService wraps downstream work in runWithRequestContext({ tenantId, userId })
```

From that point on, **all downstream code** (services, repositories,
Prisma extension) inherits the `tenantId` via `AsyncLocalStorage`. The
Prisma extension in `custom-prisma-client.ts` intercepts every query and
appends `accountId` automatically. For MongoDB (`bot_ai_history`),
isolation is enforced by prefixing `sessionId`:
`tenant:<accountId>:user:<userId>:conv:<id>`.

## Telegram

`TelegramProvider` uses `@builderbot-plugins/telegram` (based on Telegraf) and
exposes a `ProviderClass` that builderbot handles natively. To activate it:

1. Create a bot with [@BotFather](https://t.me/BotFather) and get the token.
2. Add `TELEGRAM_BOT_TOKEN=<token>` to `.env`.
3. Set `BOT_ENABLED=telegram` (or `both` for WhatsApp + Telegram).
4. `BotService` creates one bot instance per provider — Telegram and WhatsApp
   share the same flows, i18n, and multi-tenant logic with zero changes.

## File reference

| Topic | File |
|---|---|
| Main orchestrator | `services/bot.service.ts` |
| Tenant resolution → ALS | `services/tenant-bot-context.service.ts` |
| Command vs AI router | `services/message-router.service.ts` |
| Link codes | `services/link-code.service.ts`, `repositories/link-code.repository.ts` |
| Conversations | `repositories/bot-conversation.repository.ts` |
| AI history (Mongo) | `repositories/ai-history.repository.ts`, `models/ai-history.model.ts` |
| Provider interface | `providers/ibot-provider.interface.ts` |
| WhatsApp (Baileys) | `providers/whatsapp/whatsapp.provider.ts` |
| Telegram (Telegraf) | `providers/telegram/telegram.provider.ts` |
| Outbound queue | `queues.ts` |
| HTTP endpoints | `controllers/bot.controller.ts` |
| DTOs | `services/dto/generate-link-code.dto.ts`, `services/dto/link-status.dto.ts` |
| i18n | `lang/en.ts`, `lang/es.ts`, `lang/index.ts` |
| Domain errors | `errors/*.error.ts` |
| builderbot flows | `flows/*.flow.ts`, `flows/shared/*.ts` |
| Tenant context helper | `flows/shared/resolve-tenant.ts` |
| Shared types | `types/bot-context.types.ts` |
| Barrel export | `index.ts` |
| Prisma models | `prisma/schema.prisma` → `BotLinkCode`, `BotConversation` |
