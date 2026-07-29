import { describe, it, expect } from 'vitest';
import { rolesToPermissions } from './permissions';
import { Permission } from './types';

describe('rolesToPermissions', () => {
  it('expands ACCOUNT_OWNER to its full permission set', () => {
    const perms = rolesToPermissions(['ACCOUNT_OWNER']);
    expect(perms).toContain(Permission.MANAGE_ALARMS);
    expect(perms).toContain(Permission.MANAGE_ACCOUNT);
  });

  it('gives MEMBER only read permissions', () => {
    const perms = rolesToPermissions(['MEMBER']);
    expect(perms).toContain(Permission.VIEW_ALARMS);
    expect(perms).not.toContain(Permission.MANAGE_ALARMS);
  });

  it('grants everything to SUPER_ADMIN', () => {
    const perms = rolesToPermissions(['SUPER_ADMIN']);
    expect(perms).toEqual(expect.arrayContaining(Object.values(Permission)));
  });

  it('returns an empty set for unknown roles', () => {
    expect(rolesToPermissions(['NOBODY'])).toEqual([]);
  });
});
