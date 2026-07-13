import { describe, it, expect } from 'vitest';
import { mapAccountDTOToViewModel } from '../mappers/account-mapper';
import type { AccountDTO } from '../services/types';

describe('mapAccountDTOToViewModel', () => {
  const mockDTO: AccountDTO = {
    id: 'acc-1',
    name: 'Acme Corp',
    status: 'active',
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-06-01T10:30:00.000Z',
    ownerEmail: 'admin@acme.dev',
    userCount: 5,
    planName: 'Pro',
  };

  it('maps DTO fields to ViewModel', () => {
    const vm = mapAccountDTOToViewModel(mockDTO);
    expect(vm.id).toBe('acc-1');
    expect(vm.name).toBe('Acme Corp');
    expect(vm.ownerEmail).toBe('admin@acme.dev');
    expect(vm.userCount).toBe(5);
    expect(vm.planName).toBe('Pro');
    expect(vm.createdAt).toBeInstanceOf(Date);
    expect(vm.createdAt.toISOString()).toBe('2024-01-15T10:30:00.000Z');
  });

  it('maps status to badge config', () => {
    expect(mapAccountDTOToViewModel(mockDTO).statusBadge.label).toBe('Active');
    expect(mapAccountDTOToViewModel({ ...mockDTO, status: 'suspended' }).statusBadge.label).toBe('Suspended');
    expect(mapAccountDTOToViewModel({ ...mockDTO, status: 'deleted' }).statusBadge.label).toBe('Deleted');
  });
});
