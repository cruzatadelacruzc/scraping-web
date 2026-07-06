import { injectable } from 'inversify';
import { IRevolicoProduct } from '@scrapers/revolico/models/product.model';
import { ProductListItemType, ProductDetailType } from '@admin/services/dto/product-response.dto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Serialize a value that could be a Mongoose ObjectId or already a string. */
const toStringId = (id: unknown): string => {
  if (id === undefined || id === null) return '';
  if (typeof id === 'string') return id;
  // Mongoose ObjectId instances have a toString() method
  if (typeof id === 'object' && id !== null && typeof (id as Record<string, unknown>).toString === 'function') {
    return String(id);
  }
  return String(id);
};

/** Serialize a Date or date-like value to an ISO string, or return as-is if string. */
const toISODate = (d: unknown): string => {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === 'string') return d;
  return String(d ?? '');
};

// ---------------------------------------------------------------------------
// History entry helper: sort desc by updatedAt
// ---------------------------------------------------------------------------

const sortByUpdatedAtDesc = <T extends { updatedAt: unknown }>(items: T[]): T[] =>
  [...items].sort((a, b) => {
    const da = a.updatedAt instanceof Date ? a.updatedAt.getTime() : Number(new Date(a.updatedAt as string));
    const db = b.updatedAt instanceof Date ? b.updatedAt.getTime() : Number(new Date(b.updatedAt as string));
    return db - da;
  });

// ---------------------------------------------------------------------------
// Exported mapper functions
// ---------------------------------------------------------------------------

/**
 * Maps a Mongoose product document to a lightweight ProductListItemDTO-compatible object.
 * Excludes all history arrays.
 * @param model - The product document from the database.
 * @returns A plain object matching ProductListItemType.
 */
export function toProductListItemDTO(model: IRevolicoProduct): ProductListItemType {
  return {
    _id: toStringId(model._id),
    ID: model.ID,
    category: model.category,
    subcategory: model.subcategory,
    url: model.url,
    description: model.description,
    cost: model.cost,
    currency: model.currency,
    price: model.price,
    imageURL: model.imageURL,
    isOutstanding: model.isOutstanding,
    isPromoted: model.isPromoted,
    location: model.location ? { state: model.location.state, municipality: model.location.municipality } : undefined,
    views: model.views,
    seller: model.seller ? { name: model.seller.name } : undefined,
    metadata: model.metadata ? { scrapedAt: model.metadata.scrapedAt } : undefined,
    createdAt: toISODate((model as unknown as Record<string, unknown>).createdAt),
    updatedAt: toISODate((model as unknown as Record<string, unknown>).updatedAt),
  };
}

/**
 * Maps a Mongoose product document to a full ProductDetailDTO-compatible object.
 * Excludes all history arrays.
 * @param model - The product document from the database.
 * @returns A plain object matching ProductDetailType.
 */
export function toProductDetailDTO(model: IRevolicoProduct): ProductDetailType {
  return {
    _id: toStringId(model._id),
    ID: model.ID,
    category: model.category,
    subcategory: model.subcategory,
    url: model.url,
    description: model.description,
    cost: model.cost,
    currency: model.currency,
    price: model.price,
    imageURL: model.imageURL,
    isOutstanding: model.isOutstanding,
    isPromoted: model.isPromoted,
    location: model.location ? { state: model.location.state, municipality: model.location.municipality } : undefined,
    views: model.views,
    seller: model.seller
      ? {
          name: model.seller.name,
          phone: model.seller.phone,
          email: model.seller.email,
          whatsapp: model.seller.whatsapp,
        }
      : undefined,
    metadata: model.metadata
      ? {
          source: model.metadata.source as string | undefined,
          schemaVersion: model.metadata.schemaVersion as number | undefined,
          scrapedAt: model.metadata.scrapedAt,
        }
      : undefined,
    tags: model.tags,
    attributes: model.attributes,
    analytics: model.analytics,
    createdAt: toISODate((model as unknown as Record<string, unknown>).createdAt),
    updatedAt: toISODate((model as unknown as Record<string, unknown>).updatedAt),
  };
}

/**
 * Maps an array of Mongoose product documents to ProductListItemDTO-compatible objects.
 * @param models - Array of product documents.
 * @returns Array of plain objects matching ProductListItemType.
 */
export function toProductListItemDTOs(models: IRevolicoProduct[]): ProductListItemType[] {
  return models.map(toProductListItemDTO);
}

// ---------------------------------------------------------------------------
// PaginatedResponse
// ---------------------------------------------------------------------------

/** Shape of a paginated API response. */
export interface IPaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    skip: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * Creates a paginated response wrapper.
 * @param data - The array of items for the current page.
 * @param total - Total number of items matching the query.
 * @param skip - Number of items skipped.
 * @param limit - Max items per page.
 * @returns A paginated response object.
 */
export function toPaginatedResponse<T>(data: T[], total: number, skip: number, limit: number): IPaginatedResponse<T> {
  return {
    data,
    meta: {
      total,
      skip,
      limit,
      hasMore: skip + data.length < total,
    },
  };
}

// ---------------------------------------------------------------------------
// History entry mappers
// ---------------------------------------------------------------------------

/** A history entry with a numeric value and updatedAt timestamp. */
interface IValueHistoryEntry {
  value: number;
  updatedAt: string;
}

/** A location history entry. */
interface ILocationHistoryEntry {
  location: {
    state: string;
    municipality?: string;
  };
  updatedAt: string;
}

/** Wrapper for history responses. */
interface IHistoryWrapper<T> {
  data: T[];
  total: number;
}

/**
 * Maps and sorts price history entries, newest first.
 * @param priceHistory - The raw price history array from the product document.
 * @returns Sorted history entries wrapped in { data, total }.
 */
export function toPriceHistoryEntries(priceHistory: { value: number; updatedAt: Date }[] | undefined): IHistoryWrapper<IValueHistoryEntry> {
  if (!priceHistory || !Array.isArray(priceHistory)) return { data: [], total: 0 };
  const sorted = sortByUpdatedAtDesc(priceHistory);
  return {
    data: sorted.map(e => ({ value: e.value, updatedAt: toISODate(e.updatedAt) })),
    total: sorted.length,
  };
}

/**
 * Maps and sorts views history entries, newest first.
 * @param viewsHistory - The raw views history array from the product document.
 * @returns Sorted history entries wrapped in { data, total }.
 */
export function toViewsHistoryEntries(viewsHistory: { value: number; updatedAt: Date }[] | undefined): IHistoryWrapper<IValueHistoryEntry> {
  if (!viewsHistory || !Array.isArray(viewsHistory)) return { data: [], total: 0 };
  const sorted = sortByUpdatedAtDesc(viewsHistory);
  return {
    data: sorted.map(e => ({ value: e.value, updatedAt: toISODate(e.updatedAt) })),
    total: sorted.length,
  };
}

/**
 * Maps and sorts location history entries, newest first.
 * @param locationHistory - The raw location history array from the product document.
 * @returns Sorted history entries wrapped in { data, total }.
 */
export function toLocationHistoryEntries(
  locationHistory: { value: { state: string; municipality: string }; updatedAt: Date }[] | undefined,
): IHistoryWrapper<ILocationHistoryEntry> {
  if (!locationHistory || !Array.isArray(locationHistory)) return { data: [], total: 0 };
  const sorted = sortByUpdatedAtDesc(locationHistory);
  return {
    data: sorted.map(e => ({
      location: {
        state: e.value.state,
        municipality: e.value.municipality,
      },
      updatedAt: toISODate(e.updatedAt),
    })),
    total: sorted.length,
  };
}

/**
 * Maps and sorts outstanding history entries, newest first.
 * @param isOutstandingHistory - The raw outstanding history array from the product document.
 * @returns Sorted history entries wrapped in { data, total }.
 */
export function toOutstandingHistoryEntries(
  isOutstandingHistory: { value: boolean; updatedAt: Date }[] | undefined,
): IHistoryWrapper<IValueHistoryEntry> {
  if (!isOutstandingHistory || !Array.isArray(isOutstandingHistory)) return { data: [], total: 0 };
  const sorted = sortByUpdatedAtDesc(isOutstandingHistory);
  return {
    data: sorted.map(e => ({ value: e.value ? 1 : 0, updatedAt: toISODate(e.updatedAt) })),
    total: sorted.length,
  };
}

/**
 * Maps and sorts promoted history entries, newest first.
 * @param isPromotedHistory - The raw promoted history array from the product document.
 * @returns Sorted history entries wrapped in { data, total }.
 */
export function toPromotedHistoryEntries(
  isPromotedHistory: { value: boolean; updatedAt: Date }[] | undefined,
): IHistoryWrapper<IValueHistoryEntry> {
  if (!isPromotedHistory || !Array.isArray(isPromotedHistory)) return { data: [], total: 0 };
  const sorted = sortByUpdatedAtDesc(isPromotedHistory);
  return {
    data: sorted.map(e => ({ value: e.value ? 1 : 0, updatedAt: toISODate(e.updatedAt) })),
    total: sorted.length,
  };
}

// ---------------------------------------------------------------------------
// DI-friendly class (wraps the pure functions for Inversify registration)
// ---------------------------------------------------------------------------

/**
 * Mapper for transforming Mongoose product documents into DTOs.
 * All methods are pure — no DB/queue/logger access.
 */
@injectable()
export class ProductMapper {
  public toProductListItemDTO = toProductListItemDTO;
  public toProductDetailDTO = toProductDetailDTO;
  public toProductListItemDTOs = toProductListItemDTOs;
  public toPaginatedResponse = toPaginatedResponse;
  public toPriceHistoryEntries = toPriceHistoryEntries;
  public toViewsHistoryEntries = toViewsHistoryEntries;
  public toLocationHistoryEntries = toLocationHistoryEntries;
  public toOutstandingHistoryEntries = toOutstandingHistoryEntries;
  public toPromotedHistoryEntries = toPromotedHistoryEntries;
}
