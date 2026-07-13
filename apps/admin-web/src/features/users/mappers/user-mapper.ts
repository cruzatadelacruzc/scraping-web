import type { UserDTO } from '../services/users-service';
import type { UserViewModel } from '../view-models/user-view-model';

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
