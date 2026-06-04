import { User, Prisma } from '@prisma/client';
import { UserDTO } from '@users/dto/user.dto';
import { injectable } from 'inversify';
import { omitKeys } from '@utils/object.utils';
import { UserRegisterDTO } from '@users/dto/user-register.dto';
import { RoleType } from '@users/dto';

@injectable()
export class UserMapper {
  /**
   * Convert UserDTO to Prisma User model
   * @param dto User registration data
   * @param passwordHash Hashed password
   */
  public toCreateInput(
    dto: Omit<UserRegisterDTO, 'password'> & { passwordHash?: string; emailVerified?: boolean | null },
  ): Prisma.UserCreateInput {
    const { roleIds, accountId, passwordHash, emailVerified, ...rest } = dto;
    return {
      ...rest, // includes email, username, displayName?, avatarUrl?
      ...(passwordHash !== undefined ? { passwordHash } : {}),
      ...(typeof emailVerified === 'boolean' ? { emailVerified } : {}),
      account: { connect: { id: accountId } },
      ...(roleIds && roleIds.length ? { roles: { connect: roleIds.map(id => ({ id })) } } : {}),
    };
  }

  public toUpdateInput(
    dto: Partial<Omit<UserRegisterDTO, 'password'>> & { passwordHash?: string; emailVerified?: boolean | null },
  ): Prisma.UserUpdateInput {
    const { roleIds, accountId, passwordHash, emailVerified, ...rest } = dto;
    const updateInput: Prisma.UserUpdateInput = {};

    // Copy only defined scalar fields
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) {
        (updateInput as any)[key] = value;
      }
    }

    // Optional specific fields
    if (passwordHash !== undefined) updateInput.passwordHash = passwordHash;
    if (typeof emailVerified === 'boolean') updateInput.emailVerified = emailVerified;

    // Optional relation updates
    if (accountId) updateInput.account = { connect: { id: accountId } };
    if (roleIds && roleIds.length > 0) updateInput.roles = { set: roleIds.map(id => ({ id })) };

    return updateInput;
  }

  /**
   * Convert Prisma User model to DTO
   * @param prismaUser User from database
   * @returns {UserDTO | undefined} The user DTO or undefined if input is null/undefined
   */
  public toDTO(prismaUser: (User & { roles?: RoleType[] }) | null | undefined): UserDTO | null {
    if (!prismaUser) {
      return null;
    }
    return {
      ...omitKeys(prismaUser, ['passwordHash']),
      roles: prismaUser.roles || [],
    } as UserDTO;
  }

  /**
   * Convert array of Prisma User models to DTOs
   * @param users Array of users from database
   * @returns {UserDTO[]} Array of user DTOs, empty array if input is null/undefined
   */
  public toDTOs(users: (User & { roles?: RoleType[] })[] | null | undefined): UserDTO[] {
    if (!users?.length) return [];
    return users.map(user => this.toDTO(user)).filter((dto): dto is UserDTO => dto !== undefined);
  }
}
