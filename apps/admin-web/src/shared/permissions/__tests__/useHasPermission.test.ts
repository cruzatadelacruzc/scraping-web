import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { Permission } from '../permission';
import { useHasPermission } from '../useHasPermission';

const { mockUseCurrentUser } = vi.hoisted(() => ({
  mockUseCurrentUser: vi.fn(),
}));

import type { RoleType } from '@shared/auth';

vi.mock('@shared/auth', () => ({
  useCurrentUser: mockUseCurrentUser,
  RoleType: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ACCOUNT_OWNER: 'ACCOUNT_OWNER',
    MEMBER: 'MEMBER',
  },
}));

describe('useHasPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true for all permissions when user is SUPER_ADMIN', () => {
    mockUseCurrentUser.mockReturnValue({
      userId: 'u1',
      accountId: 'a1',
      roles: ['SUPER_ADMIN'],
      username: 'admin',
      email: 'admin@test.dev',
      expiresAt: Date.now() + 86400000,
    });

    const { result } = renderHook(() => useHasPermission());
    const hasPermission = result.current;

    Object.values(Permission).forEach((p) => {
      expect(hasPermission(p)).toBe(true);
    });
  });

  it('ACCOUNT_OWNER lacks MANAGE_SCRAPERS', () => {
    mockUseCurrentUser.mockReturnValue({
      userId: 'u2',
      accountId: 'a1',
      roles: ['ACCOUNT_OWNER'],
      username: 'owner',
      email: 'owner@test.dev',
      expiresAt: Date.now() + 86400000,
    });

    const { result } = renderHook(() => useHasPermission());
    const hasPermission = result.current;

    expect(hasPermission(Permission.VIEW_DASHBOARD)).toBe(true);
    expect(hasPermission(Permission.VIEW_ACCOUNTS)).toBe(true);
    expect(hasPermission(Permission.MANAGE_SCRAPERS)).toBe(false);
  });

  it('SUPER_ADMIN has plans and subscriptions permissions', () => {
    mockUseCurrentUser.mockReturnValue({
      userId: 'u1',
      accountId: 'a1',
      roles: ['SUPER_ADMIN'],
      username: 'admin',
      email: 'admin@test.dev',
      expiresAt: Date.now() + 86400000,
    });

    const { result } = renderHook(() => useHasPermission());
    const hasPermission = result.current;

    expect(hasPermission(Permission.VIEW_PLANS)).toBe(true);
    expect(hasPermission(Permission.MANAGE_PLANS)).toBe(true);
    expect(hasPermission(Permission.VIEW_SUBSCRIPTIONS)).toBe(true);
    expect(hasPermission(Permission.MANAGE_SUBSCRIPTIONS)).toBe(true);
  });

  it('ACCOUNT_OWNER does not have plans and subscriptions permissions', () => {
    mockUseCurrentUser.mockReturnValue({
      userId: 'u2',
      accountId: 'a1',
      roles: ['ACCOUNT_OWNER'],
      username: 'owner',
      email: 'owner@test.dev',
      expiresAt: Date.now() + 86400000,
    });

    const { result } = renderHook(() => useHasPermission());
    const hasPermission = result.current;

    expect(hasPermission(Permission.VIEW_PLANS)).toBe(false);
    expect(hasPermission(Permission.MANAGE_PLANS)).toBe(false);
    expect(hasPermission(Permission.VIEW_SUBSCRIPTIONS)).toBe(false);
    expect(hasPermission(Permission.MANAGE_SUBSCRIPTIONS)).toBe(false);
  });

  it('MEMBER does not have plans and subscriptions permissions', () => {
    mockUseCurrentUser.mockReturnValue({
      userId: 'u4',
      accountId: 'a1',
      roles: ['MEMBER'],
      username: 'member',
      email: 'member@test.dev',
      expiresAt: Date.now() + 86400000,
    });

    const { result } = renderHook(() => useHasPermission());
    const hasPermission = result.current;

    expect(hasPermission(Permission.VIEW_PLANS)).toBe(false);
    expect(hasPermission(Permission.MANAGE_PLANS)).toBe(false);
    expect(hasPermission(Permission.VIEW_SUBSCRIPTIONS)).toBe(false);
    expect(hasPermission(Permission.MANAGE_SUBSCRIPTIONS)).toBe(false);
  });

  it('does not throw when session has an unknown role and returns false', () => {
    mockUseCurrentUser.mockReturnValue({
      userId: 'u3',
      accountId: 'a1',
      roles: ['GHOST_ROLE' as RoleType],
      username: 'ghost',
      email: 'ghost@test.dev',
      expiresAt: Date.now() + 86400000,
    });

    const { result } = renderHook(() => useHasPermission());
    const hasPermission = result.current;

    expect(() => hasPermission(Permission.VIEW_DASHBOARD)).not.toThrow();
    expect(hasPermission(Permission.VIEW_DASHBOARD)).toBe(false);
  });

  it('returns false for all permissions when no session', () => {
    mockUseCurrentUser.mockReturnValue(null);

    const { result } = renderHook(() => useHasPermission());
    const hasPermission = result.current;

    Object.values(Permission).forEach((p) => {
      expect(hasPermission(p)).toBe(false);
    });
  });
});
