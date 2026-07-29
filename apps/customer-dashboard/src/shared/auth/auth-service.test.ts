import { describe, it, expect } from 'vitest';
import { AuthService } from './auth-service';

const svc = new AuthService();

describe('AuthService (against MSW real-contract handlers)', () => {
  it('register runs the 3-call chain and returns a mapped session', async () => {
    const session = await svc.register({
      email: 'alice@example.com',
      username: 'alice',
      password: 'Passw0rd',
      displayName: 'Alice',
    });

    // Envelope unwrapped + token mapping
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
    expect(session.expiresAt).toBeGreaterThan(Date.now());
    // User + roles/permissions derived
    expect(session.user.email).toBe('alice@example.com');
    expect(session.user.username).toBe('alice');
    expect(session.roles).toContain('ACCOUNT_OWNER');
    expect(session.permissions.length).toBeGreaterThan(0);
  });

  it('login authenticates a registered user (email or username)', async () => {
    await svc.register({ email: 'bob@example.com', username: 'bob', password: 'Passw0rd' });
    const byEmail = await svc.login('bob@example.com', 'Passw0rd');
    expect(byEmail.user.username).toBe('bob');
    const byUsername = await svc.login('bob', 'Passw0rd');
    expect(byUsername.user.email).toBe('bob@example.com');
  });

  it('login rejects invalid credentials', async () => {
    await expect(svc.login('ghost@example.com', 'nope')).rejects.toBeTruthy();
  });

  it('refresh rotates and returns a fresh session', async () => {
    const s = await svc.register({
      email: 'carol@example.com',
      username: 'carol',
      password: 'Passw0rd',
    });
    const refreshed = await svc.refresh(s.refreshToken);
    expect(refreshed.accessToken).toBeTruthy();
    expect(refreshed.user.email).toBe('carol@example.com');
  });
});
