import type { ScraperConfigModel } from '@scrapers/revolico/services/scraping/repositories/scraper-config.repository';

/**
 * Response shape returned by the ScraperConfig CRUD endpoints. Mirrors the
 * Prisma `ScraperConfig` model 1-to-1 except that timestamps are ISO strings
 * (JSON-friendly), per the project's API conventions.
 */
export interface IScraperConfigResponseDTO {
  id: string;
  storeKey: string;
  expression: string;
  version: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pure transform from a Prisma `ScraperConfig` row to the wire DTO. No DB,
 * queue, or logger access — see `.claude/rules/compliance-checklist.md`.
 *
 * @param {ScraperConfigModel} model - The Prisma row.
 * @returns {IScraperConfigResponseDTO} The wire DTO.
 */
export function toScraperConfigResponseDTO(model: ScraperConfigModel): IScraperConfigResponseDTO {
  return {
    id: model.id,
    storeKey: model.storeKey,
    expression: model.expression,
    version: model.version,
    enabled: model.enabled,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  };
}
