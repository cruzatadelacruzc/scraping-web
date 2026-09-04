import { describe, it, expect, beforeEach } from 'vitest';
import { apiClient } from '@/shared/api/client';
import { users, issueTokens } from './_shared';
import { resetAlarmsStore } from './alarms-handlers';

const demo = users.get('demo@bazaarsentinel.app')!;

function authHeader() {
  return { Authorization: `Bearer ${issueTokens(demo).token}` };
}

const validAlarm = {
  productUrl: 'https://www.revolico.com/item/iphone-12',
  name: 'iPhone drop',
  condition: 'PRICE_DROPS_BELOW',
  threshold: 400,
};

describe('alarms MSW handlers (real-contract)', () => {
  beforeEach(() => resetAlarmsStore());

  it('rejects unauthenticated list with 401', async () => {
    await expect(apiClient.get('/api/alarms')).rejects.toMatchObject({ status: 401 });
  });

  it('supports the full CRUD cycle', async () => {
    const h = { headers: authHeader() };
    const created = await apiClient.post<{ alarm: { id: string } }>('/api/alarms', validAlarm, h);
    const id = created.data.alarm.id;

    const list = await apiClient.get<{ alarms: unknown[] }>('/api/alarms', h);
    expect(list.data.alarms).toHaveLength(1);

    const one = await apiClient.get<{ id: string }>(`/api/alarms/${id}`, h);
    expect(one.data.id).toBe(id);

    const updated = await apiClient.put<{ alarm: { enabled: boolean } }>(
      `/api/alarms/${id}`,
      { enabled: false },
      h
    );
    expect(updated.data.alarm.enabled).toBe(false);

    await apiClient.delete(`/api/alarms/${id}`, h);
    const after = await apiClient.get<{ alarms: unknown[] }>('/api/alarms', h);
    expect(after.data.alarms).toHaveLength(0);
  });

  it('enforces the TRIAL maxAlarms=3 with a 403 message-only error', async () => {
    const h = { headers: authHeader() };
    for (let i = 0; i < 3; i++) {
      await apiClient.post('/api/alarms', { ...validAlarm, name: `a${i}` }, h);
    }
    await expect(apiClient.post('/api/alarms', validAlarm, h)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('serves subscription + plan features for the demo account', async () => {
    const h = { headers: authHeader() };
    const subs = await apiClient.get<{ subscriptions: { planId: string; status: string }[] }>(
      `/api/accounts/${demo.accountId}/subscriptions`,
      h
    );
    expect(subs.data.subscriptions[0].status).toBe('TRIALING');

    const plan = await apiClient.get<{ plan: { features: { maxAlarms: number } } }>(
      `/api/plans/${subs.data.subscriptions[0].planId}`,
      h
    );
    expect(plan.data.plan.features.maxAlarms).toBe(3);
  });

  it('searches products with filters and pagination', async () => {
    const h = { headers: authHeader() };
    const page = await apiClient.get<{
      data: { category: string; price: number }[];
      meta: { total: number; hasMore: boolean };
    }>('/api/products?category=compra-venta&minPrice=100&limit=5', h);
    expect(page.data.data.length).toBeGreaterThan(0);
    expect(page.data.data.every((p) => p.category === 'compra-venta' && p.price >= 100)).toBe(true);

    const cats = await apiClient.get<{ category: string; subcategories: string[] }[]>(
      '/api/products/categories',
      h
    );
    expect(cats.data.find((c) => c.category === 'compra-venta')).toBeTruthy();
  });
});
