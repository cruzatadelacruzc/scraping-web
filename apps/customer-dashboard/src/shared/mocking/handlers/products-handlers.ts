import { http } from 'msw';
import { ok, fail, userFromAuth } from './_shared';
import { productsFixture } from '../fixtures/products-fixture';

export const productsHandlers = [
  http.get('/api/products', ({ request }) => {
    if (!userFromAuth(request)) return fail('Unauthorized', 401);
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase();
    const category = url.searchParams.get('category');
    const subcategory = url.searchParams.get('subcategory');
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');
    const skip = Number(url.searchParams.get('skip') ?? 0);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);

    let items = productsFixture;
    if (search) items = items.filter((p) => p.description?.toLowerCase().includes(search));
    if (category) items = items.filter((p) => p.category === category);
    if (subcategory) items = items.filter((p) => p.subcategory === subcategory);
    if (minPrice) items = items.filter((p) => p.price >= Number(minPrice));
    if (maxPrice) items = items.filter((p) => p.price <= Number(maxPrice));

    const page = items.slice(skip, skip + limit);
    return ok({
      data: page,
      meta: { total: items.length, skip, limit, hasMore: skip + page.length < items.length },
    });
  }),

  http.get('/api/products/categories', ({ request }) => {
    if (!userFromAuth(request)) return fail('Unauthorized', 401);
    const grouped = new Map<string, Set<string>>();
    for (const p of productsFixture) {
      const subs = grouped.get(p.category) ?? new Set<string>();
      if (p.subcategory) subs.add(p.subcategory);
      grouped.set(p.category, subs);
    }
    return ok(
      [...grouped.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, subs]) => ({ category, subcategories: [...subs].sort() }))
    );
  }),
];
