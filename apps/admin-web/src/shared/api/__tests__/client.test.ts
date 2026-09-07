import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const API = 'http://localhost:3000/api';

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  vi.resetModules();
});
afterAll(() => {
  server.close();
});

/** Re-import the module so each test gets a fresh axios instance + interceptors. */
async function loadClient() {
  return import('../client');
}

describe('apiClient 401 handling', () => {
  let accessToken: string;

  beforeEach(() => {
    accessToken = 'old-token';
  });

  it('refreshes once on 401 and retries the original request with the new token', async () => {
    const seenAuth: string[] = [];
    server.use(
      http.get(`${API}/widgets`, ({ request }) => {
        seenAuth.push(request.headers.get('authorization') ?? '');
        if (seenAuth.length === 1) {
          return new HttpResponse(null, { status: 401 });
        }
        return HttpResponse.json({ status: 'ok', message: 'ok', data: { id: 'w1' } });
      }),
    );

    const refresh = vi.fn().mockImplementation(() => {
      accessToken = 'new-token';
      return Promise.resolve();
    });
    const onRefreshFail = vi.fn();

    const { apiClient, configureAuthHandlers } = await loadClient();
    configureAuthHandlers({
      getAccessToken: () => accessToken,
      refresh,
      onRefreshFail,
    });

    const res = await apiClient.get('/widgets');

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onRefreshFail).not.toHaveBeenCalled();
    expect(res.data).toEqual({ id: 'w1' });
    expect(seenAuth).toEqual(['Bearer old-token', 'Bearer new-token']);
  });

  it('calls onRefreshFail and rejects when the refresh fails', async () => {
    server.use(http.get(`${API}/widgets`, () => new HttpResponse(null, { status: 401 })));

    const refresh = vi.fn().mockRejectedValue(new Error('Session expired'));
    const onRefreshFail = vi.fn();

    const { apiClient, configureAuthHandlers } = await loadClient();
    configureAuthHandlers({
      getAccessToken: () => accessToken,
      refresh,
      onRefreshFail,
    });

    await expect(apiClient.get('/widgets')).rejects.toThrow();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onRefreshFail).toHaveBeenCalledTimes(1);
  });

  it('fails when the refresh resolves but leaves no access token (SessionManager cleared it)', async () => {
    server.use(http.get(`${API}/widgets`, () => new HttpResponse(null, { status: 401 })));

    // Mirrors SessionManager.refresh(): resolves even on failure, but the
    // underlying AuthService has cleared storage, so no token remains.
    const refresh = vi.fn().mockImplementation(() => {
      accessToken = '';
      return Promise.resolve();
    });
    const onRefreshFail = vi.fn();

    const { apiClient, configureAuthHandlers } = await loadClient();
    configureAuthHandlers({
      getAccessToken: () => (accessToken === '' ? null : accessToken),
      refresh,
      onRefreshFail,
    });

    await expect(apiClient.get('/widgets')).rejects.toThrow();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onRefreshFail).toHaveBeenCalledTimes(1);
  });

  it('does not attempt a second refresh if the retried request also 401s', async () => {
    server.use(http.get(`${API}/widgets`, () => new HttpResponse(null, { status: 401 })));

    const refresh = vi.fn().mockResolvedValue(undefined);
    const onRefreshFail = vi.fn();

    const { apiClient, configureAuthHandlers } = await loadClient();
    configureAuthHandlers({
      getAccessToken: () => accessToken,
      refresh,
      onRefreshFail,
    });

    await expect(apiClient.get('/widgets')).rejects.toThrow();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
