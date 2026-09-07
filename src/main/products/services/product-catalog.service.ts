import { inject, injectable } from 'inversify';
import { PipelineStage, RootFilterQuery } from 'mongoose';
import { IPaginatedResponse, toPaginatedResponse } from '@admin/mappers/product.mapper';
import { IRevolicoProduct } from '@scrapers/revolico/models/product.model';
import { ProductRepository } from '@scrapers/revolico/repositories/product.repository';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { toProductCatalogItems } from '../mappers/product-catalog.mapper';
import { ProductCatalogItemType, ProductCategoryGroupType } from './dto/product-catalog-item.dto';
import { ProductCatalogQueryDTO } from './dto/product-catalog-query.dto';

const CATALOG_PROJECTION: Partial<Record<keyof IRevolicoProduct, 0>> = {
  priceHistory: 0,
  viewsHistory: 0,
  locationHistory: 0,
  isOutstandingHistory: 0,
  isPromotedHistory: 0,
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Customer-facing product catalog: paginated search + category listing.
 * Reuses the revolico ProductRepository (Mongo product data is shared
 * across tenants by design — no tenant isolation applies).
 */
@injectable()
export class ProductCatalogService {
  public constructor(
    @inject(ProductRepository) private readonly _repo: ProductRepository,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = ProductCatalogService.name;
  }

  /**
   * Searches the product catalog with text/category/price filters.
   * @param query - Validated catalog query.
   * @returns Paginated reduced catalog items.
   */
  public async list(query: ProductCatalogQueryDTO): Promise<IPaginatedResponse<ProductCatalogItemType>> {
    const filter = this.buildFilter(query);
    const [products, total] = await Promise.all([
      this._repo.find(
        query.skip,
        query.limit,
        { field: query.sort, order: query.order },
        filter,
        CATALOG_PROJECTION as Partial<Record<keyof IRevolicoProduct, 1 | 0>>,
      ),
      this._repo.count(filter),
    ]);
    return toPaginatedResponse(toProductCatalogItems(products), total, query.skip, query.limit);
  }

  /**
   * Lists distinct categories with their subcategories for filter UIs.
   * @returns Alphabetically sorted category groups (empty categories skipped).
   */
  public async categories(): Promise<ProductCategoryGroupType[]> {
    const pipeline: PipelineStage[] = [{ $group: { _id: { category: '$category', subcategory: '$subcategory' } } }];
    const rows = (await this._repo.aggregate(pipeline)) as {
      _id: { category?: string | null; subcategory?: string | null };
    }[];

    const grouped = new Map<string, Set<string>>();
    for (const row of rows) {
      const category = row._id.category?.trim();
      if (!category) continue;
      const subs = grouped.get(category) ?? new Set<string>();
      const sub = row._id.subcategory?.trim();
      if (sub) subs.add(sub);
      grouped.set(category, subs);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, subs]) => ({
        category,
        subcategories: [...subs].sort((a, b) => a.localeCompare(b)),
      }));
  }

  private buildFilter(query: ProductCatalogQueryDTO): RootFilterQuery<IRevolicoProduct> {
    const filter: Record<string, unknown> = {};
    if (query.search) {
      filter.description = { $regex: escapeRegex(query.search), $options: 'i' };
    }
    if (query.category) filter.category = query.category;
    if (query.subcategory) filter.subcategory = query.subcategory;
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      const price: Record<string, number> = {};
      if (query.minPrice !== undefined) price.$gte = query.minPrice;
      if (query.maxPrice !== undefined) price.$lte = query.maxPrice;
      filter.price = price;
    }
    return filter as RootFilterQuery<IRevolicoProduct>;
  }
}
