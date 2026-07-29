import { describe, expect, it } from 'vitest';

import { mapRoleDTOToViewModel } from '../mappers/user-mapper';

describe('mapRoleDTOToViewModel', () => {
  it('maps an active role (deletedAt null)', () => {
    const vm = mapRoleDTOToViewModel({
      id: 'r1',
      name: 'ACCOUNT_OWNER',
      accountId: null,
      deletedAt: null,
      userCount: 3,
    });
    expect(vm).toEqual({ id: 'r1', name: 'ACCOUNT_OWNER', userCount: 3, active: true });
  });

  it('maps an inactive role (deletedAt set)', () => {
    const vm = mapRoleDTOToViewModel({
      id: 'r2',
      name: 'MEMBER',
      accountId: null,
      deletedAt: '2026-07-01T00:00:00.000Z',
      userCount: 0,
    });
    expect(vm.active).toBe(false);
  });

  it('defaults userCount to 0 when the backend omits it', () => {
    const vm = mapRoleDTOToViewModel({
      id: 'r3',
      name: 'MEMBER',
      accountId: null,
      deletedAt: null,
    });
    expect(vm.userCount).toBe(0);
  });
});
