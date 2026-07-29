import { http } from 'msw';
import { ok } from './_shared';

/** Minimal stubs for feature endpoints not yet built (Phases 2-5). */
export const miscHandlers = [
  http.get('/api/alarms', () => ok([])),
  http.get('/api/notifications', () => ok([])),
  http.get('/api/bots/status', () =>
    ok({ linked: false, provider: null, externalId: null, lastActivity: null })
  ),
  http.get('/api/account', () => ok({ id: 'acc_demo', name: 'Demo Account', settings: {} })),
];
