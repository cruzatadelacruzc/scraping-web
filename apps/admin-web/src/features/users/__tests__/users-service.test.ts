import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGet, mockPost, mockDelete, mockPatch } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockDelete: vi.fn(),
  mockPatch: vi.fn(),
}));

vi.mock('@shared/api/client', () => ({
  apiClient: {
    get: mockGet,
    post: mockPost,
    delete: mockDelete,
    patch: mockPatch,
  },
}));

import { usersService } from '../services/users-service';

describe('usersService role endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assigns a role via the admin route', () => {
    void usersService.assignRole('u1', 'r1');
    expect(mockPost).toHaveBeenCalledWith('/admin/users/u1/roles/r1');
  });

  it('removes a role via the admin route', () => {
    void usersService.removeRole('u1', 'r1');
    expect(mockDelete).toHaveBeenCalledWith('/admin/users/u1/roles/r1');
  });

  it('toggles a role via PATCH /admin/roles/:id/toggle', () => {
    void usersService.toggleRole('r1');
    expect(mockPatch).toHaveBeenCalledWith('/admin/roles/r1/toggle');
  });
});
