---
name: docker-dev
description: 'Project-specific dev environment: docker-compose services (MongoDB 4.4.5, Redis 7.4, Postgres 16) and local workflow. Use when asking about local setup, dependencies, why a service is not connecting, or how to reset state.'
applyTo: 'docker-compose.yml, .env.example, Dockerfile'
risk: low
---

# Docker Dev Environment

The project uses **three** Docker services for local development (managed via `docker-compose.yml`). All are required — they back different subsystems and cannot be merged.

## Services

| Service   | Image                    | Port  | Purpose                              | Volume                     |
|-----------|--------------------------|-------|--------------------------------------|----------------------------|
| `mongo`   | `mongo:4.4.5`            | 27017 | Scraped products + price history     | `${VOL_DIR}/scraper`       |
| `redis`   | `redis:7.4.0-alpine`     | 6379  | BullMQ queues (Bull Board backend)   | `${VOL_DIR}/bull_redis`    |
| `postgres`| `postgres:16`            | 5432  | Tenants, accounts, alarms, plans     | `${VOL_DIR}/postgresql`    |

Notes:
- Mongo and Postgres **cannot** share a single instance — different engines.
- BullMQ requires its own Redis (separate from app caches).
- `redis-server` runs with `--save 60 1` (snapshot every 60s if ≥1 key changed) and `--loglevel warning`.
- Postgres uses `pg_isready -U revolico` as the healthcheck (10s interval, 5 retries).

## Workflow

```bash
# Start all services in the background
docker-compose up -d

# Tail logs of a single service
docker-compose logs -f mongo
docker-compose logs -f redis
docker-compose logs -f postgres

# Stop services (keeps volumes)
docker-compose down

# FULL RESET — stop and DELETE all volumes (irreversible)
docker-compose down -v
```

If `docker-compose up -d` fails with "port is already allocated", check `lsof -i :27017`, `lsof -i :6379`, `lsof -i :5432` and stop the conflicting host process.

## Required env vars

Copy `.env.example` to `.env` and fill in values. The compose file references `${VAR}` placeholders that come from `.env`:

```
DB_URI                  # mongodb://root:password@localhost:27017/<DB_NAME>?authSource=admin
DB_ROOT_USERNAME        # mongo root user
DB_ROOT_PASSWORD        # mongo root password
DB_NAME                 # mongo database name
VOL_DIR                 # host directory for persisted volumes (default /srv/volumes)
REDIS_URL               # redis://localhost:6379
TENANT_DB_URL           # postgresql://revolico:revolico@localhost:5432/revolico
PUPPETEER_EXECUTABLE_PATH  # /usr/bin/google-chrome-stable (dev) or /usr/bin/chromium (prod)
JWT_SECRET              # change-me-to-a-random-secret
JWT_EXPIRATION          # 1d
SUPER_ADMIN_EMAIL       # used by `npm run seed`
SUPER_ADMIN_PASSWORD    # used by `npm run seed`
GOOGLE_ISSUERS          # comma-separated JWT issuers
GOOGLE_JWKS_URI         # JWKS endpoint for Google ID token verification
GOOGLE_CLIENT_ID        # OAuth client id
FACEBOOK_ISSUERS        # comma-separated JWT issuers
FACEBOOK_JWKS_URI       # JWKS endpoint for Facebook
FACEBOOK_CLIENT_ID      # OAuth client id
BULL_BOARD_USER         # dashboard basic auth user
BULL_BOARD_PASSWORD     # dashboard basic auth password
BULL_AREANA_URL         # dashboard mount path (default /arena)
BOT_ENABLED             # whatsapp | telegram | both | none
WHATSAPP_SESSION_NAME   # Baileys session folder name
TELEGRAM_BOT_TOKEN      # required only if BOT_ENABLED includes telegram
WEB_APP_BASE_URL        # used to build deep links in bot welcome messages
OPENAI_API_KEY          # optional in dev (canned-response fallback)
MONGODB_BOT_HISTORY_COLL # collection for LangChain chat history
BOT_LINK_CODE_TTL_MINUTES  # link code expiration
BOT_OUTBOUND_CONCURRENCY   # WhatsApp send rate-limit guard
```

`VOL_DIR=/srv/volumes` is the default in `.env.example`. On Linux this requires write access to `/srv`. If it fails, change `VOL_DIR` in `.env` to a path you own (e.g. `VOL_DIR=$HOME/.scrapper-volumes`).

## Health checks

After `docker-compose up -d`, verify each service responds:

```bash
mongosh "mongodb://${DB_ROOT_USERNAME}:${DB_ROOT_PASSWORD}@localhost:27017/admin" --eval 'db.runCommand({ping: 1})'
redis-cli ping                # → PONG
psql "${TENANT_DB_URL}" -c 'select 1'
```

## Integration with tests

**Tests do NOT use docker-compose.** `jest-mongodb-config.js` + `globalSetup.ts` start a `MongoMemoryServer` in-process. PostgreSQL in tests is mocked via Prisma. Redis is mocked via `@shared/queue/__mocks__/`. Don't try to connect to a real DB from CI.

## Troubleshooting

| Symptom                                         | Likely cause                          | Fix                                            |
|-------------------------------------------------|---------------------------------------|------------------------------------------------|
| `ECONNREFUSED 127.0.0.1:27017`                  | mongo container not up                | `docker-compose up -d mongo`                   |
| `ECONNREFUSED 127.0.0.1:6379`                   | redis container not up                | `docker-compose up -d redis`                   |
| `P1001 Can't reach database server`             | postgres down or wrong `TENANT_DB_URL`| check compose logs + env var                   |
| App boots but Puppeteer fails                   | `PUPPETEER_EXECUTABLE_PATH` missing   | install Chrome (`apt install google-chrome-stable`) and set the env var |
| `permission denied` on `/srv/volumes`           | `VOL_DIR` not writable                | change `VOL_DIR` in `.env`                     |
| Old data persists after schema changes          | mongo/postgres volumes not reset      | `docker-compose down -v` then `up -d` (irreversible) |