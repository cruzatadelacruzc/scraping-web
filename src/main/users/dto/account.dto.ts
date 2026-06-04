import { z, ZodError } from 'zod';
import {} from '@prisma/client';
import { ValidationError } from '@shared/errors/validation.error';

/**
 * Zod schema for validating and parsing Account data.
 */
export const AccountSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  settings: z.record(z.any()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type AccountType = z.infer<typeof AccountSchema>;

/**
 * Data Transfer Object for Account entity.
 */
export class AccountDTO {
  /**
   * @param name       - Human-readable account name.
   * @param id         - Unique identifier of the account.
   * @param settings   - JSON settings for the account.
   * @param createdAt  - Timestamp when the account was created.
   * @param updatedAt  - Timestamp when the account was last updated.
   */
  public constructor(
    public readonly name: string,
    public readonly id?: string,
    public readonly settings?: Record<string, any>,
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
  public static from(data: Partial<AccountType>): AccountDTO {
    try {
      const parsed = AccountSchema.parse(data);
      return new AccountDTO(parsed.name, parsed.id, parsed.settings, parsed.createdAt, parsed.updatedAt);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
