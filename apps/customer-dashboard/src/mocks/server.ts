import { setupServer } from 'msw/node';
import { handlers } from '@/shared/mocking/handlers';

/** Node (vitest) MSW server, using the same canonical handler set as the browser worker. */
export const server = setupServer(...handlers);
