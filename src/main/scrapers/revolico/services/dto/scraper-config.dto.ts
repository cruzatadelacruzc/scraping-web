import { ValidationError } from '@shared/errors/validation.error';
import { z } from 'zod';

/**
 * POST /api/revolicos/scraper-configs body. The `storeKey` must be unique —
 * if it already exists, the service throws `ScraperConfigAlreadyExistsError`
 * (translated to 409 by the controller).
 */
const CreateSchema = z.object({
  storeKey: z.string().min(1),
  expression: z.string().min(1),
});

export type CreateScraperConfigType = z.infer<typeof CreateSchema>;

/**
 * Request body for POST /api/revolicos/scraper-configs.
 */
export class CreateScraperConfigDTO {
  public constructor(
    public readonly storeKey: string,
    public readonly expression: string,
  ) {}

  /**
   * Parse and validate a request body into a typed DTO.
   *
   * @param {unknown} data - The request body.
   * @returns {CreateScraperConfigDTO} The validated DTO.
   * @throws {ValidationError} When the body fails Zod validation.
   */
  public static from(data: unknown): CreateScraperConfigDTO {
    try {
      const parsed = CreateSchema.parse(data);
      return new CreateScraperConfigDTO(parsed.storeKey, parsed.expression);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}

/**
 * PUT /api/revolicos/scraper-configs/:storeKey body. Only the expression is
 * editable through this endpoint; `enabled` is admin-controlled via SQL or a
 * future toggle endpoint.
 */
const UpdateSchema = z.object({
  expression: z.string().min(1),
});

export type UpdateScraperConfigType = z.infer<typeof UpdateSchema>;

/**
 * Request body for PUT /api/revolicos/scraper-configs/:storeKey.
 */
export class UpdateScraperConfigDTO {
  public constructor(public readonly expression: string) {}

  /**
   * Parse and validate a request body into a typed DTO.
   *
   * @param {unknown} data - The request body.
   * @returns {UpdateScraperConfigDTO} The validated DTO.
   * @throws {ValidationError} When the body fails Zod validation.
   */
  public static from(data: unknown): UpdateScraperConfigDTO {
    try {
      const parsed = UpdateSchema.parse(data);
      return new UpdateScraperConfigDTO(parsed.expression);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
