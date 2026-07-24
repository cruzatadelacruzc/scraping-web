import { AccountSubscription, Prisma, SubscriptionStatusType } from '@prisma/client';
import { AccountDTO, AccountSubscriptionDTO } from '@users/dto';
import { injectable } from 'inversify';

/**
 * Responsible for converting between Prisma models and DTOs for Subscriptions.
 */
@injectable()
export class SubscriptionsMapper {
  /**
   * Converts a Prisma AccountSubscription model into an AccountSubscriptionDTO.
   *
   * @param model - The AccountSubscription model from Prisma.
   * @returns {AccountSubscriptionDTO | null} - The corresponding DTO or null if the model is null/undefined.
   */
  public toDTO(model: AccountSubscription | null | undefined): AccountSubscriptionDTO | null {
    if (!model) {
      return null;
    }

    return new AccountSubscriptionDTO(
      model.accountId,
      model.planId,
      model.status,
      model.id,
      model.periodStart,
      model.periodEnd,
      model.createdAt,
      model.updatedAt,
    );
  }

  /**
   * Maps an array of Prisma AccountSubscription models to an array of AccountSubscriptionDTOs.
   * @param models - Array of Prisma AccountSubscription models.
   * @returns AccountSubscriptionDTO[] — never null (returns empty array if no models).
   */
  public toDTOs(models: Array<AccountSubscription>): AccountSubscriptionDTO[] {
    return models.reduce<AccountSubscriptionDTO[]>((acc, m) => {
      const dto = this.toDTO(m);
      if (dto) acc.push(dto);
      return acc;
    }, []);
  }

  /**
   * Converts a Prisma AccountSubscription model into an AccountSubscriptionDTO.
   *
   * @param model - The AccountSubscription model from Prisma, including partial account.
   * @returns {AccountSubscriptionDTO | null} - The corresponding DTO or null if the model is null/undefined.
   */
  public toDTOWithAccount(
    model: Prisma.AccountSubscriptionGetPayload<{ include: { account: { omit: { settings: true } } } }> | null | undefined,
  ): (AccountSubscriptionDTO & { account: AccountDTO }) | null {
    if (!model) return null;

    const baseDto = new AccountSubscriptionDTO(
      model.accountId,
      model.planId,
      model.status as SubscriptionStatusType,
      model.id,
      model.periodStart,
      model.periodEnd,
      model.createdAt,
      model.updatedAt,
    );
    if (!baseDto) return null;

    const account = AccountDTO.from(model.account);

    return { ...baseDto, account };
  }
}
