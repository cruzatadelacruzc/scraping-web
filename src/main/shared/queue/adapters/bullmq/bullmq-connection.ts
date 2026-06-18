import { ConnectionOptions } from 'bullmq';

/**
 * Builds the {@link ConnectionOptions} for BullMQ from the application
 * environment. Honours `REDIS_HOST`/`REDIS_PORT` first, falls back to
 * parsing `REDIS_URL`, and finally to `localhost:6379`.
 *
 * BullMQ requires `maxRetriesPerRequest: null` on the worker's connection
 * to keep the polling loop alive. The producer side should use a bounded
 * value so that HTTP endpoints fail fast when Redis is down.
 */
export function buildBullMQConnection(opts: { forWorker: boolean; overrideUrl?: string }): ConnectionOptions {
  const url = opts.overrideUrl ?? process.env.REDIS_URL ?? 'redis://localhost:6379';
  const parsed = parseRedisUrl(url);

  const base: ConnectionOptions = {
    host: process.env.REDIS_HOST ?? parsed.host,
    port: Number(process.env.REDIS_PORT ?? parsed.port),
    password: process.env.REDIS_PASSWORD ?? parsed.password,
    username: process.env.REDIS_USERNAME ?? parsed.username,
    db: process.env.REDIS_DB ? Number(process.env.REDIS_DB) : parsed.db,
  };

  return {
    ...base,
    maxRetriesPerRequest: opts.forWorker ? null : 1,
  };
}

interface IParsedRedis {
  host: string;
  port: number;
  password?: string;
  username?: string;
  db?: number;
}

function parseRedisUrl(url: string): IParsedRedis {
  try {
    const u = new URL(url);
    const db = u.pathname && u.pathname !== '/' ? Number(u.pathname.replace('/', '')) : undefined;
    return {
      host: u.hostname || 'localhost',
      port: u.port ? Number(u.port) : 6379,
      password: u.password || undefined,
      username: u.username || undefined,
      db: Number.isFinite(db) ? (db as number) : undefined,
    };
  } catch {
    return { host: 'localhost', port: 6379 };
  }
}
