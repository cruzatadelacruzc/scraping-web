import type { ProductDTO } from '../services/products-service';
import type { ProductViewModel } from '../view-models/product-view-model';

export function mapProductDTOToViewModel(dto: ProductDTO): ProductViewModel {
  return {
    id: dto._id,
    title: dto.description ?? 'Untitled',
    category: dto.category,
    price: dto.price,
    currency: dto.currency,
    locationState: dto.location?.state,
    views: dto.views,
    isOutstanding: dto.isOutstanding,
    isPromoted: dto.isPromoted ?? false,
    hasEnrichment: dto.hasEnrichment,
    createdAt: new Date(dto.createdAt),
  };
}
