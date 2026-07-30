import type { RoleDTO, UserDTO } from '../services/users-service';
import type { RoleViewModel, UserViewModel } from '../view-models/user-view-model';

export function mapUserDTOToViewModel(dto: UserDTO): UserViewModel {
  return {
    id: dto.id,
    email: dto.email,
    username: dto.username,
    displayName: dto.displayName ?? dto.username,
    roles: dto.roles.map((r) => r.name),
    emailVerified: dto.emailVerified,
    createdAt: new Date(dto.createdAt),
  };
}

export function mapRoleDTOToViewModel(dto: RoleDTO): RoleViewModel {
  return {
    id: dto.id,
    name: dto.name,
    userCount: dto.userCount ?? 0,
    active: dto.deletedAt === null,
  };
}
