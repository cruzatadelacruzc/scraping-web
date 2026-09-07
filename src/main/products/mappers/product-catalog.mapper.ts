import { IRevolicoProduct } from '@scrapers/revolico/models/product.model';
import { ProductCatalogItemType } from '../services/dto/product-catalog-item.dto';

function toISO(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value ?? ''));
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}

/**
 * Maps a Mongoose product model to the reduced customer-facing catalog item.
 * @param model - Raw revolico product document.
 * @returns Catalog item without internal flags or seller contact data.
 */
export function toProductCatalogItem(model: IRevolicoProduct): ProductCatalogItemType {
  return {
    id: String(model._id),
    url: model.url,
    description: model.description,
    price: model.price,
    currency: model.currency,
    imageURL: model.imageURL,
    isOutstanding: model.isOutstanding,
    views: model.views,
    location: model.location ? { state: model.location.state, municipality: model.location.municipality } : undefined,
    seller: model.seller ? { name: model.seller.name } : undefined,
    category: model.category ?? '',
    subcategory: model.subcategory,
    updatedAt: toISO((model as unknown as Record<string, unknown>).updatedAt),
  };
}

/**
 * Maps a list of product documents to catalog items.
 * @param models - Raw revolico product documents.
 * @returns Catalog items in the same order.
 */
export function toProductCatalogItems(models: IRevolicoProduct[]): ProductCatalogItemType[] {
  return models.map(toProductCatalogItem);
}
