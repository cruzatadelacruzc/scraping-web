import 'dotenv/config';
import 'module-alias/register';
import 'reflect-metadata';

// Force IPv4 — IPv6 is unreachable in this environment, and Node's
// default dual-stack resolution causes intermittent ETIMEDOUT to
// external APIs (Telegram, Google, etc.).
import https from 'https';
https.globalAgent.options.family = 4;

import { App } from './app';

console.clear();

/**
 * Initializes the application and starts the server.
 *
 * @returns {Promise<void>} A promise that resolves when the server is started.
 */
export async function bootstrap(): Promise<void> {
  new App().setup();
}

bootstrap();
