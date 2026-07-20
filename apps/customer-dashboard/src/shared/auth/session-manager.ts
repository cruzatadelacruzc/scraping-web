import type { AuthSession } from './types';

export class SessionManager {
  private refreshPromise: Promise<AuthSession> | null = null;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  async initialize(): Promise<void> {
    // Check for existing session - will be implemented with actual refresh
  }

  async refresh(): Promise<AuthSession> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<AuthSession> {
    // Will call authService.refresh()
    throw new Error('Not implemented - will call auth service');
  }

  scheduleRefresh(expiresAt: number): void {
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
    }

    const refreshAt = expiresAt - Date.now() - 60_000;
    if (refreshAt > 0) {
      this.expiryTimer = setTimeout(() => {
        this.refresh().catch(console.error);
      }, refreshAt);
    }
  }

  cancelScheduledRefresh(): void {
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }
}