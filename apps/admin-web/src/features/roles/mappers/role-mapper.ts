import type { RoleDTO } from '../services/roles-service';
import type { RoleViewModel } from '../view-models/role-view-model';

export function mapRoleDTOToViewModel(dto: RoleDTO): RoleViewModel {
  return {
    id: dto.id,
    name: dto.name,
    userCount: dto._count?.users ?? 0,
  };
}
