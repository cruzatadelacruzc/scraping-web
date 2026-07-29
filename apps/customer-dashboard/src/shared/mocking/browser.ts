import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * Starts the MSW browser worker when enabled. Awaited in main.tsx BEFORE the
 * app renders so the first requests are intercepted (no race).
 */
export async function startMockWorker(): Promise<void> {
  if (import.meta.env.VITE_MSW_ENABLED !== 'true') return;
  const worker = setupWorker(...handlers);
  await worker.start({ onUnhandledRequest: 'bypass' });
}
