import { ValidationError } from '@shared/errors/validation.error';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// CreateRuleDTO
// ---------------------------------------------------------------------------

export const CreateRuleSchema = z.object({
  ruleKey: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z][a-zA-Z0-9]*$/, 'ruleKey must be alphanumeric'),
  values: z.array(z.string().min(1)).min(1, 'values must be a non-empty array of strings'),
});

export type CreateRuleType = z.infer<typeof CreateRuleSchema>;

export class CreateRuleDTO {
  public readonly ruleKey: string;
  public readonly values: string[];

  private constructor(data: CreateRuleType) {
    this.ruleKey = data.ruleKey;
    this.values = data.values;
  }

  /**
   * Creates a CreateRuleDTO from an unvalidated request body.
   * @param body - The raw request body.
   * @returns A validated CreateRuleDTO.
   * @throws {ValidationError} When the body fails Zod validation.
   */
  public static from(body: unknown): CreateRuleDTO {
    try {
      const parsed = CreateRuleSchema.parse(body);
      return new CreateRuleDTO(parsed);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// UpdateRuleDTO
// ---------------------------------------------------------------------------

export const UpdateRuleSchema = z.object({
  values: z.array(z.string().min(1)).min(1, 'values must be a non-empty array of strings'),
});

export type UpdateRuleType = z.infer<typeof UpdateRuleSchema>;

export class UpdateRuleDTO {
  public readonly values: string[];

  private constructor(data: UpdateRuleType) {
    this.values = data.values;
  }

  /**
   * Creates an UpdateRuleDTO from an unvalidated request body.
   * @param body - The raw request body.
   * @returns A validated UpdateRuleDTO.
   * @throws {ValidationError} When the body fails Zod validation.
   */
  public static from(body: unknown): UpdateRuleDTO {
    try {
      const parsed = UpdateRuleSchema.parse(body);
      return new UpdateRuleDTO(parsed);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
