import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { authService, useAuthStore } from '@/shared/auth';
import { resetAlarmsStore } from '@/shared/mocking/handlers/alarms-handlers';
import { alarmsService } from './alarms-service';
import { productsService } from './products-service';
import { planService } from './plan-service';

beforeAll(async () => {
  const session = await authService.login('demo@bazaarsentinel.app', 'Demo1234');
  useAuthStore.getState().setSession(session);
});

beforeEach(() => resetAlarmsStore());

describe('alarmsService (against MSW)', () => {
  it('creates, lists, updates and deletes alarms', async () => {
    const created = await alarmsService.create({
      productUrl: 'https://r/x',
      name: 'Test',
      condition: 'PRICE_DROPS_BELOW',
      threshold: 100,
    });
    expect(created.id).toBeTruthy();

    expect(await alarmsService.list()).toHaveLength(1);

    const updated = await alarmsService.update(created.id, { enabled: false });
    expect(updated.enabled).toBe(false);

    await alarmsService.remove(created.id);
    expect(await alarmsService.list()).toHaveLength(0);
  });

  it('surfaces the plan-limit 403 as ApiError with status', async () => {
    for (let i = 0; i < 3; i++) {
      await alarmsService.create({
        productUrl: 'https://r/x',
        name: `a${i}`,
        condition: 'PRICE_DROPS_BELOW',
        threshold: 1,
      });
    }
    await expect(
      alarmsService.create({
        productUrl: 'https://r/x',
        name: 'overflow',
        condition: 'PRICE_DROPS_BELOW',
        threshold: 1,
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe('productsService (against MSW)', () => {
  it('searches with filters and normalizes the page shape', async () => {
    const page = await productsService.search({ category: 'autos', skip: 0, limit: 4 });
    expect(page.items.every((p) => p.category === 'autos')).toBe(true);
    expect(page.limit).toBe(4);
    expect(typeof page.hasMore).toBe('boolean');
  });

  it('lists category groups', async () => {
    const groups = await productsService.categories();
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0]).toHaveProperty('subcategories');
  });
});

describe('planService (against MSW)', () => {
  it('fetches subscriptions and the plan with features', async () => {
    const subs = await planService.subscriptions('acc_demo');
    expect(subs[0].status).toBe('TRIALING');
    const plan = await planService.plan(subs[0].planId);
    expect(plan.features.maxAlarms).toBe(3);
  });
});
