import { CreateRoleDTO, CreateRoleSchema, ListRolesQueryDTO, RoleResponseDTO } from '@admin/services/dto/role.dto';

describe('CreateRoleDTO', () => {
  describe('validation schema', () => {
    it('should accept valid input with just name', () => {
      const result = CreateRoleSchema.parse({ name: 'ADMIN' });
      expect(result).toEqual({ name: 'ADMIN' });
    });

    it('should accept valid input with name and accountId', () => {
      const result = CreateRoleSchema.parse({ name: 'CUSTOM_ROLE', accountId: 'acc-1' });
      expect(result).toEqual({ name: 'CUSTOM_ROLE', accountId: 'acc-1' });
    });

    it('should reject empty name', () => {
      expect(() => CreateRoleSchema.parse({ name: '' })).toThrow();
    });

    it('should reject missing name', () => {
      expect(() => CreateRoleSchema.parse({})).toThrow();
    });
  });

  describe('from', () => {
    it('should create DTO from valid body', () => {
      const dto = CreateRoleDTO.from({ name: 'MODERATOR' });
      expect(dto).toBeInstanceOf(CreateRoleDTO);
      expect(dto.name).toBe('MODERATOR');
      expect(dto.accountId).toBeUndefined();
    });

    it('should create DTO with optional accountId', () => {
      const dto = CreateRoleDTO.from({ name: 'TENANT_ROLE', accountId: 'acc-2' });
      expect(dto.name).toBe('TENANT_ROLE');
      expect(dto.accountId).toBe('acc-2');
    });

    it('should throw on invalid body', () => {
      expect(() => CreateRoleDTO.from({ name: '' })).toThrow();
    });
  });
});

describe('ListRolesQueryDTO', () => {
  it('should accept empty query (no status)', () => {
    const dto = ListRolesQueryDTO.from({});
    expect(dto.status).toBeUndefined();
  });

  it('should accept status=active', () => {
    const dto = ListRolesQueryDTO.from({ status: 'active' });
    expect(dto.status).toBe('active');
  });

  it('should accept status=inactive', () => {
    const dto = ListRolesQueryDTO.from({ status: 'inactive' });
    expect(dto.status).toBe('inactive');
  });

  it('should reject an invalid status value', () => {
    expect(() => ListRolesQueryDTO.from({ status: 'deleted' })).toThrow();
  });
});

describe('RoleResponseDTO deletedAt', () => {
  it('should expose deletedAt when present', () => {
    const when = new Date('2026-07-16T00:00:00Z');
    const dto = RoleResponseDTO.from({ id: 'r1', name: 'MEMBER', accountId: null, deletedAt: when });
    expect(dto.deletedAt).toEqual(when);
  });

  it('should default deletedAt to null when absent', () => {
    const dto = RoleResponseDTO.from({ id: 'r1', name: 'MEMBER', accountId: null });
    expect(dto.deletedAt).toBeNull();
  });
});
