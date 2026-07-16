import type { ProductStatsDTO } from '../services/products-stats-service';
import type { ProductStatsViewModel } from '../view-models/product-stats-view-model';

/**
 * Pure function: transforms the raw API stats DTO into a UI-oriented ViewModel.
 */
export function mapProductStatsDTOToViewModel(dto: ProductStatsDTO): ProductStatsViewModel {
  const totalScraped = dto.enrichedCount + dto.unenrichedCount;
  const enrichmentPercent =
    totalScraped > 0 ? Math.round((dto.enrichedCount / totalScraped) * 100) : 0;

  let lastScrapedLabel: string;
  if (dto.lastScrapedAt) {
    const d = new Date(dto.lastScrapedAt);
    lastScrapedLabel = d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } else {
    lastScrapedLabel = 'Never';
  }

  return {
    totalProducts: dto.totalProducts,
    byCategory: dto.byCategory,
    byState: dto.byState,
    outstandingCount: dto.outstandingCount,
    promotedCount: dto.promotedCount,
    lastScrapedAt: dto.lastScrapedAt ? new Date(dto.lastScrapedAt) : null,
    priceRange: dto.priceRange,
    enrichedCount: dto.enrichedCount,
    unenrichedCount: dto.unenrichedCount,
    enrichmentPercent,
    lastScrapedLabel,
    priceRangeLabel: `$${dto.priceRange.min.toLocaleString()} — $${dto.priceRange.max.toLocaleString()}`,
  };
}
