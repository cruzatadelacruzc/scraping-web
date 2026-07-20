import { setupWorker } from 'msw/browser';
import { authHandlers } from './handlers/auth-handlers';

if (import.meta.env.VITE_MSW_ENABLED === 'true') {
  const worker = setupWorker(...authHandlers);
  worker.start();
}