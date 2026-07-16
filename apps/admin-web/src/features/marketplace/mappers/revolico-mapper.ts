import type { ScraperConfigDTO } from '../services/revolico-service';
import type { ScraperConfigViewModel } from '../view-models/revolico-view-model';

/**
 * Maps a raw ScraperConfigDTO (from the API) to a ScraperConfigViewModel
 * consumable by the UI. Pure function — no side effects, no I/O.
 */
export function mapScraperConfigDTOToViewModel(dto: ScraperConfigDTO): ScraperConfigViewModel {
  return {
    id: dto.id,
    storeKey: dto.storeKey,
    expression: dto.expression,
    enabled: dto.enabled,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}
