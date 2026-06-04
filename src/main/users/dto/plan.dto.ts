import { PlanType as PrismaPlanType } from '@prisma/client';
import { ValidationError } from '@shared/errors/validation.error';
import { z } from 'zod';

/**
 * Zod schema for validating and parsing Plan data.
 */
export const PlanSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(3),
  type: z.nativeEnum(PrismaPlanType),
  features: z.record(z.any()),
  price: z.number().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  subscriptionIds: z.array(z.string().uuid()).optional(),
});

export type PlanType = z.infer<typeof PlanSchema>;

/**
 * Data Transfer Object for Plan entity.
 */
export class PlanDTO {
  /**
   * Creates a new PlanDTO.
   *
   * @param name - Human-readable plan name.
   * @param type - Plan type key (e.g. 'trial', 'standard', 'unlimited').
   * @param features - Metadatas object for this plan.
   * @param price - Numeric price of the plan (optional).
   * @param id - Unique identifier of the plan (optional).
   * @param createdAt - Creation timestamp (optional).
   * @param updatedAt - Last update timestamp (optional).
   * @param subscriptionIds - List of subscription IDs associated with this plan (optional).
   */
  public constructor(
    public readonly name: string,
    public readonly type: PrismaPlanType,
    public readonly features: Record<string, any>,
    public readonly price?: number,
    public readonly id?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
    public readonly subscriptionIds?: string[],
  ) {}

  /**
   * @description Factory method that creates a `PlanDTO` instance from validated data.
   * Validates input data using `PlanSchema` and if valid, creates a new `PlanDTO` object.
   *
   * @param {Partial<PlanType>} data - Input data to be validated.
   * @returns {PlanDTO} - New `PlanDTO` instance with validated data.
   * @throws {ValidationError} If the input data fails Zod validation.
   */
  public static from(data: Partial<PlanType>): PlanDTO {
    try {
      const parsed = PlanSchema.parse(data);
      return new PlanDTO(
        parsed.name,
        parsed.type,
        parsed.features,
        parsed.price,
        parsed.id,
        parsed.createdAt,
        parsed.updatedAt,
        parsed.subscriptionIds,
      );
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
