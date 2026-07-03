import 'dotenv/config';
import 'module-alias/register';
import 'reflect-metadata';
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
