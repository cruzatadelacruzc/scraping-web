import { injectable, inject } from 'inversify';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { ProductRepository } from '@scrapers/revolico/repositories/product.repository';
import { IRevolicoProduct } from '@scrapers/revolico/models/product.model';
import { RootFilterQuery } from 'mongoose';
import { ProductListQueryDTO } from '@admin/services/dto/product-list-query.dto';
import { ProductListItemType, ProductDetailType, ProductStatsType } from '@admin/services/dto/product-response.dto';
import {
  toProductListItemDTOs,
  toProductDetailDTO,
  toPaginatedResponse,
  toPriceHistoryEntries,
  toViewsHistoryEntries,
  toLocationHistoryEntries,
  toOutstandingHistoryEntries,
  toPromotedHistoryEntries,
  IPaginatedResponse,
} from '@admin/mappers/product.mapper';

/** Projection that excludes heavy history arrays. */
const WITHOUT_HISTORY_PROJECTION: Partial<Record<keyof IRevolicoProduct, 0>> = {
  priceHistory: 0,
  viewsHistory: 0,
  locationHistory: 0,
  isOutstandingHistory: 0,
  isPromotedHistory: 0,
};

/** Wrapper type returned by history mappers. */
interface IHistoryWrapper<T> {
  data: T[];
  total: number;
}

@injectable()
export class ProductAdminService {
  public constructor(
    @inject(ProductRepository) private readonly _repo: ProductRepository,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = ProductAdminService.name;
  }

  /**
   * Lists products with pagination, filtering, and sorting.
   * @param query - Validated query parameters.
   * @returns Paginated list of product DTOs.
   */
  public async list(query: ProductListQueryDTO): Promise<IPaginatedResponse<ProductListItemType>> {
    const filter = this.buildFilter(query);
    const sortField = query.sort || 'createdAt';
    const sortOrder = query.order || 'desc';

    const [products, total] = await Promise.all([
      this._repo.find(
        query.skip,
        query.limit,
        { field: sortField, order: sortOrder },
        filter,
        WITHOUT_HISTORY_PROJECTION as Partial<Record<keyof IRevolicoProduct, 1 | 0>>,
      ),
      this._repo.count(filter),
    ]);

    const dtos = toProductListItemDTOs(products);
    return toPaginatedResponse(dtos, total, query.skip, query.limit);
  }

  /**
   * Retrieves a single product by its MongoDB _id (full detail, no history).
   * @param id - The product _id.
   * @returns The product DTO or null if not found.
   */
  public async getById(id: string): Promise<ProductDetailType | null> {
    const product = await this._repo.findOne({ _id: id }, WITHOUT_HISTORY_PROJECTION as Partial<Record<keyof IRevolicoProduct, 1 | 0>>);
    if (!product) return null;
    return toProductDetailDTO(product);
  }

  /**
   * Retrieves price history for a product, sorted newest first.
   * @param id - The product _id.
   * @returns History wrapper or null if product not found.
   */
  public async getPriceHistory(id: string): Promise<IHistoryWrapper<{ value: number; updatedAt: string }> | null> {
    const product = await this._repo.findOne({ _id: id });
    if (!product) return null;
    return toPriceHistoryEntries(product.priceHistory);
  }

  /**
   * Retrieves views history for a product, sorted newest first.
   * @param id - The product _id.
   * @returns History wrapper or null if product not found.
   */
  public async getViewsHistory(id: string): Promise<IHistoryWrapper<{ value: number; updatedAt: string }> | null> {
    const product = await this._repo.findOne({ _id: id });
    if (!product) return null;
    return toViewsHistoryEntries(product.viewsHistory);
  }

  /**
   * Retrieves location history for a product, sorted newest first.
   * @param id - The product _id.
   * @returns History wrapper or null if product not found.
   */
  public async getLocationHistory(
    id: string,
  ): Promise<IHistoryWrapper<{ location: { state: string; municipality?: string }; updatedAt: string }> | null> {
    const product = await this._repo.findOne({ _id: id });
    if (!product) return null;
    return toLocationHistoryEntries(product.locationHistory);
  }

  /**
   * Retrieves outstanding history for a product, sorted newest first.
   * @param id - The product _id.
   * @returns History wrapper or null if product not found.
   */
  public async getOutstandingHistory(id: string): Promise<IHistoryWrapper<{ value: number; updatedAt: string }> | null> {
    const product = await this._repo.findOne({ _id: id });
    if (!product) return null;
    return toOutstandingHistoryEntries(product.isOutstandingHistory);
  }

  /**
   * Retrieves promoted history for a product, sorted newest first.
   * @param id - The product _id.
   * @returns History wrapper or null if product not found.
   */
  public async getPromotedHistory(id: string): Promise<IHistoryWrapper<{ value: number; updatedAt: string }> | null> {
    const product = await this._repo.findOne({ _id: id });
    if (!product) return null;
    return toPromotedHistoryEntries(product.isPromotedHistory);
  }

  /**
   * Returns aggregated statistics across all products.
   * Uses multiple aggregation pipelines to gather: totalProducts, byCategory,
   * byState, outstandingCount, promotedCount, lastScrapedAt, and priceRange.
   * @returns Aggregated stats DTO.
   */
  public async getStats(): Promise<ProductStatsType> {
    const [byCategory, byState, counts, meta] = await Promise.all([
      this._repo.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      this._repo.aggregate([{ $group: { _id: '$location.state', count: { $sum: 1 } } }]),
      this._repo.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            outstanding: { $sum: { $cond: ['$isOutstanding', 1, 0] } },
            promoted: { $sum: { $cond: ['$isPromoted', 1, 0] } },
          },
        },
      ]),
      this._repo.aggregate([
        {
          $group: {
            _id: null,
            lastScrapedAt: { $max: '$metadata.scrapedAt' },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
          },
        },
      ]),
    ]);

    const countsRow = (counts as Array<Record<string, unknown>>)[0] ?? {};
    const metaRow = (meta as Array<Record<string, unknown>>)[0] ?? {};

    return {
      totalProducts: (countsRow.total as number) ?? 0,
      byCategory: (byCategory as Array<{ _id: string; count: number }>).filter(c => c._id).map(c => ({ category: c._id, count: c.count })),
      byState: (byState as Array<{ _id: string; count: number }>).filter(s => s._id).map(s => ({ state: s._id, count: s.count })),
      outstandingCount: (countsRow.outstanding as number) ?? 0,
      promotedCount: (countsRow.promoted as number) ?? 0,
      lastScrapedAt:
        metaRow.lastScrapedAt instanceof Date
          ? (metaRow.lastScrapedAt as Date).toISOString()
          : metaRow.lastScrapedAt
            ? String(metaRow.lastScrapedAt)
            : null,
      priceRange: {
        min: (metaRow.minPrice as number) ?? 0,
        max: (metaRow.maxPrice as number) ?? 0,
      },
    };
  }

  /**
   * Deletes a product by its MongoDB _id.
   * @param id - The product _id to delete.
   */
  public async delete(id: string): Promise<void> {
    await this._repo.deleteById(id);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Builds a Mongoose filter from the query DTO.
   * @param query - Validated list query.
   * @returns A Mongoose root filter query.
   */
  private buildFilter(query: ProductListQueryDTO): RootFilterQuery<IRevolicoProduct> {
    const filter: Record<string, unknown> = {};

    if (query.search) {
      filter.description = { $regex: query.search, $options: 'i' };
    }
    if (query.category) {
      filter.category = query.category;
    }
    if (query.subcategory) {
      filter.subcategory = query.subcategory;
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      const priceFilter: Record<string, number> = {};
      if (query.minPrice !== undefined) priceFilter.$gte = query.minPrice;
      if (query.maxPrice !== undefined) priceFilter.$lte = query.maxPrice;
      filter.price = priceFilter;
    }
    if (query.isOutstanding !== undefined) {
      filter.isOutstanding = query.isOutstanding;
    }
    if (query.isPromoted !== undefined) {
      filter.isPromoted = query.isPromoted;
    }
    if (query['location.state']) {
      filter['location.state'] = query['location.state'];
    }

    return filter as RootFilterQuery<IRevolicoProduct>;
  }
}
