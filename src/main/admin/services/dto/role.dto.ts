import { z } from 'zod';

// ---------------------------------------------------------------------------
// CreateRoleDTO
// ---------------------------------------------------------------------------

export const CreateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  accountId: z.string().optional(),
});

export type CreateRoleType = z.infer<typeof CreateRoleSchema>;

export class CreateRoleDTO {
  public readonly name: string;
  public readonly accountId?: string;

  private constructor(data: CreateRoleType) {
    this.name = data.name;
    this.accountId = data.accountId;
  }

  /**
   * Creates a CreateRoleDTO from an unvalidated request body.
   * @param body - The raw request body.
   * @returns A validated CreateRoleDTO.
   * @throws ZodError if validation fails.
   */
  public static from(body: unknown): CreateRoleDTO {
    const parsed = CreateRoleSchema.parse(body);
    return new CreateRoleDTO(parsed);
  }
}

// ---------------------------------------------------------------------------
// RoleResponseDTO
// ---------------------------------------------------------------------------

export const RoleResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  accountId: z.string().nullable(),
  _count: z
    .object({
      users: z.number(),
    })
    .optional(),
});

export type RoleResponseType = z.infer<typeof RoleResponseSchema>;

export class RoleResponseDTO {
  public readonly id: string;
  public readonly name: string;
  public readonly accountId: string | null;
  public readonly userCount?: number;

  private constructor(data: RoleResponseType) {
    this.id = data.id;
    this.name = data.name;
    this.accountId = data.accountId;
    if (data._count) {
      this.userCount = data._count.users;
    }
  }

  /**
   * Creates a RoleResponseDTO from a Prisma role model.
   * @param model - The raw Prisma role (optionally with _count).
   * @returns A RoleResponseDTO.
   */
  public static from(model: RoleResponseType): RoleResponseDTO {
    return new RoleResponseDTO(model);
  }
}
