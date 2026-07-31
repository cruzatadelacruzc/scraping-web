import { http } from 'msw';
import { ok, fail, userFromAuth } from './_shared';
import { TRIAL_PLAN } from './plans-handlers';
import type { AlarmDTO } from '@/features/alarms/types';

/** In-memory store keyed by accountId (mirrors tenant isolation). */
const alarmsByAccount = new Map<string, AlarmDTO[]>();
let seq = 0;

export function resetAlarmsStore(): void {
  alarmsByAccount.clear();
  seq = 0;
}

function accountAlarms(accountId: string): AlarmDTO[] {
  const list = alarmsByAccount.get(accountId) ?? [];
  alarmsByAccount.set(accountId, list);
  return list;
}

export const alarmsHandlers = [
  http.get('/api/alarms', ({ request }) => {
    const user = userFromAuth(request);
    if (!user) return fail('Unauthorized', 401);
    return ok({ alarms: accountAlarms(user.accountId) });
  }),

  http.post('/api/alarms', async ({ request }) => {
    const user = userFromAuth(request);
    if (!user) return fail('Unauthorized', 401);
    const list = accountAlarms(user.accountId);
    const max = TRIAL_PLAN.features.maxAlarms;
    if (max !== -1 && list.length >= max) {
      // Real backend: 403, message-only (errorCode never travels in the body).
      return fail(
        'Your current plan does not allow creating more alarms. Please upgrade your plan.',
        403,
      );
    }
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.productUrl || !body.name || !body.condition || body.threshold === undefined) {
      return fail('Validation failed', 400);
    }
    if (!TRIAL_PLAN.features.allowedConditions.includes(String(body.condition))) {
      return fail('The selected condition is not available on your current plan.', 403);
    }
    const now = new Date().toISOString();
    const alarm: AlarmDTO = {
      id: `alarm_${++seq}`,
      accountId: user.accountId,
      productUrl: String(body.productUrl),
      name: String(body.name),
      condition: body.condition as AlarmDTO['condition'],
      threshold: Number(body.threshold),
      percentage: body.percentage != null ? Number(body.percentage) : null,
      params: null,
      enabled: body.enabled !== false,
      lastEvaluatedAt: null,
      lastEvaluatedPrice: null,
      lastMatchedAt: null,
      lastNotifiedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(alarm);
    return ok({ alarm }, 'Created', 201);
  }),

  http.get('/api/alarms/:id', ({ request, params }) => {
    const user = userFromAuth(request);
    if (!user) return fail('Unauthorized', 401);
    const alarm = accountAlarms(user.accountId).find((a) => a.id === params.id);
    return alarm ? ok(alarm) : fail('Alarm not found', 404);
  }),

  http.put('/api/alarms/:id', async ({ request, params }) => {
    const user = userFromAuth(request);
    if (!user) return fail('Unauthorized', 401);
    const alarm = accountAlarms(user.accountId).find((a) => a.id === params.id);
    if (!alarm) return fail('Alarm not found', 404);
    const body = (await request.json()) as Partial<AlarmDTO>;
    if (
      body.condition !== undefined &&
      !TRIAL_PLAN.features.allowedConditions.includes(String(body.condition))
    ) {
      return fail('The selected condition is not available on your current plan.', 403);
    }
    Object.assign(alarm, {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.condition !== undefined && { condition: body.condition }),
      ...(body.threshold !== undefined && { threshold: body.threshold }),
      ...(body.percentage !== undefined && { percentage: body.percentage }),
      ...(body.enabled !== undefined && { enabled: body.enabled }),
      updatedAt: new Date().toISOString(),
    });
    return ok({ alarm });
  }),

  http.delete('/api/alarms/:id', ({ request, params }) => {
    const user = userFromAuth(request);
    if (!user) return fail('Unauthorized', 401);
    const list = accountAlarms(user.accountId);
    const idx = list.findIndex((a) => a.id === params.id);
    if (idx === -1) return fail('Alarm not found', 404);
    list.splice(idx, 1);
    return ok(undefined, 'Deleted');
  }),

  // Detail timeline (Phase 3 will grow this): empty by default, tests override via server.use().
  http.get('/api/notifications', ({ request }) => {
    const user = userFromAuth(request);
    if (!user) return fail('Unauthorized', 401);
    return ok({ notifications: [] });
  }),
];
