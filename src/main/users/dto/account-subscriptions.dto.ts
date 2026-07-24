import { z } from 'zod';
import { SubscriptionStatusType } from '@prisma/client';
import { ValidationError } from '@shared/errors/validation.error';

/**
 * Zod schema for validating and parsing Account data.
 */
export const AccountSubscriptionSchema = z.object({
  id: z.string().uuid().optional(),
  accountId: z.string().uuid(),
  planId: z.string().uuid(),
  periodStart: z.date().optional(),
  periodEnd: z.date().optional(),
  status: z.nativeEnum(SubscriptionStatusType),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type AccountSubscriptionType = z.infer<typeof AccountSubscriptionSchema>;

/**
 * Data Transfer Object for AccountSubscriptions entity.
 */
export class AccountSubscriptionDTO {
  /**
   * Creates a new AccountSubscriptionDTO.
   *
   * @param accountId - UUID of the associated account.
   * @param planId - UUID of the associated plan.
   * @param status - Current subscription status.
   * @param id - Unique identifier of the subscription (optional).
   * @param periodStart - Start date of the subscription period (optional).
   * @param periodEnd - End date of the subscription period (optional).
   * @param createdAt - Creation timestamp (optional).
   * @param updatedAt - Last update timestamp (optional).
   */
  public constructor(
    public readonly accountId: string,
    public readonly planId: string,
    public readonly status: SubscriptionStatusType,
    public readonly id?: string,
    public readonly periodStart?: Date,
    public readonly periodEnd?: Date,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  /**
   * @description Factory method that creates a `AccountDTO` instance from validated data.
   * Validates input data using `AccountSchema` and if valid, creates a new `AccountDTO` object.
   *
   * @param {Partial<AccountType>} data - Input data to be validated.
   * @returns {AccountDTO} - New `AccountDTO` instance with validated data.
   * @throws {ValidationError} If the input data fails Zod validation.
   */
  public static from(data: Partial<AccountSubscriptionType>): AccountSubscriptionDTO {
    try {
      const parsed = AccountSubscriptionSchema.parse(data);
      return new AccountSubscriptionDTO(
        parsed.accountId,
        parsed.planId,
        parsed.status,
        parsed.id,
        parsed.periodStart,
        parsed.periodEnd,
        parsed.createdAt,
        parsed.updatedAt,
      );
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
