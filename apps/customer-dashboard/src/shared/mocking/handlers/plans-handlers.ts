import { http } from 'msw';
import { ok, fail, userFromAuth } from './_shared';

/** Mirrors the seeded TRIAL plan features (runtime enforcement contract). */
export const TRIAL_PLAN = {
  id: 'plan_trial',
  name: 'Trial',
  type: 'TRIAL',
  price: 0,
  features: {
    maxAlarms: 3,
    allowedConditions: ['PRICE_DROPS_BELOW', 'PRICE_RISES_ABOVE', 'PRICE_CHANGES_BY_PERCENT'],
    aiAlarms: false,
    notificationChannels: ['in-app'],
  },
};

export const plansHandlers = [
  http.get('/api/accounts/:accountId/subscriptions', ({ request, params }) => {
    const user = userFromAuth(request);
    if (!user) return fail('Unauthorized', 401);
    return ok({
      subscriptions: [
        {
          id: 'sub_demo',
          accountId: String(params.accountId),
          planId: TRIAL_PLAN.id,
          status: 'TRIALING',
          periodStart: new Date(2026, 6, 1).toISOString(),
          periodEnd: new Date(2026, 6, 8).toISOString(),
        },
      ],
    });
  }),

  http.get('/api/plans/:id', ({ request, params }) => {
    if (!userFromAuth(request)) return fail('Unauthorized', 401);
    if (params.id !== TRIAL_PLAN.id) return fail('Plan not found', 404);
    return ok({ plan: TRIAL_PLAN });
  }),
];
