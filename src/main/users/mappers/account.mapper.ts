import { Account, Prisma } from '@prisma/client';
import { AccountDTO } from '@users/dto';
import { injectable } from 'inversify';

/**
 * Responsible for converting between Prisma models and DTOs for Account.
 */
@injectable()
export class AccountMapper {
  /**
   * Maps a AccountDTO to the data shape Prisma expects for creation.
   * @param dto - DTO with the fields required to create a account.
   * @returns Prisma.AccountCreateInput
   */
  public toCreateInput(dto: AccountDTO): Prisma.AccountCreateInput {
    return {
      name: dto.name,
      settings: dto.settings,
    };
  }

  public toDTO(model: Account | null | undefined): AccountDTO | null {
    if (!model) {
      return null;
    }

    const raw = model.settings;
    const settings = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, any>) : {};

    return new AccountDTO(model.name, model.id, settings, model.createdAt, model.updatedAt);
  }
}
