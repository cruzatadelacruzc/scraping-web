/**
 * Runs before any module is loaded. Sets test-only env defaults so the
 * DI container picks the right adapters at construction time.
 *
 * `QUEUE_BACKEND=mock` makes integration tests that boot the full App
 * use the in-memory `MockQueueAdapter` instead of opening real Redis
 * connections. This keeps the test suite self-contained (no docker-compose
 * dependency for Redis) and prevents the ~27s post-test cleanup delay that
 * BullMQ's `worker.close()` causes while it tears down its blocking
 * Redis connection.
 *
 * If you need to test real BullMQ behavior against a live Redis, set
 * `QUEUE_BACKEND=bullmq` (and `REDIS_URL`) in a dedicated test file or
 * via the environment when invoking jest.
 */
process.env.QUEUE_BACKEND = 'mock';

/**
 * Disable bot providers during tests. Bot providers (WhatsApp/Baileys,
 * Telegram/Telegraf) open real ports and try to connect to external
 * services which would hang in the test environment. Set BOT_ENABLED
 * in a dedicated test file if you need to test real bot behavior.
 */
process.env.BOT_ENABLED = 'none';
