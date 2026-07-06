import { RoleResponseDTO, RoleResponseType } from '@admin/services/dto/role.dto';

/**
 * Converts a Prisma role model (optionally with _count.users) into a RoleResponseDTO.
 * @param model - The raw role object from Prisma.
 * @returns A RoleResponseDTO with a flattened userCount.
 */
export function toRoleResponseDTO(model: RoleResponseType): RoleResponseDTO {
  return RoleResponseDTO.from(model);
}

/**
 * Converts an array of Prisma role models into RoleResponseDTOs.
 * @param models - Array of raw role objects from Prisma.
 * @returns Array of RoleResponseDTOs.
 */
export function toRoleResponseDTOs(models: RoleResponseType[]): RoleResponseDTO[] {
  return models.map(toRoleResponseDTO);
}
