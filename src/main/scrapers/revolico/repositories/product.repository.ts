import { DBContext } from '@config/db-config';
import { inject, injectable } from 'inversify';
import productModel, { IRevolicoProduct } from '../models/product.model';
import { Model, RootFilterQuery } from 'mongoose';
import { DeleteResult } from 'mongodb';

export interface ICustomInsertManyResult {
  acknowledged: boolean;
  insertedCount?: number;
  insertedIds?: Record<number, any>;
  errors?: Error[];
}

export interface IBulkWriteResultWithErrors {
  insertedIds: Record<number, any>;
  upsertedIds: Record<number, any>;
  nInserted: number;
  nUpserted: number;
  nModified: number;
  nMatched: number;
  urls: string[];
  errors: Error[];
}
@injectable()
export class ProductRepository {
  private readonly _model: Model<IRevolicoProduct>;

  public constructor(@inject(DBContext) private readonly _dbContext: DBContext) {
    this._model = productModel;
  }

  /**
   * Removes all products from the database.
   * @returns {Promise<DeleteResult>} A promise that resolves once all products have been removed.
   */
  public async clearAll(): Promise<DeleteResult> {
    return this._model.deleteMany({});
  }

  /**
   * Finds a single product from the database.
   * @param filter The filter to use when looking up the product.
   * @param projection The fields to include in the result.
   * @returns A promise that resolves with the product if found, or null if no product is found.
   */
  public async findOne(
    filter: RootFilterQuery<IRevolicoProduct>,
    projection?: Partial<Record<keyof IRevolicoProduct, 1 | 0>>,
  ): Promise<IRevolicoProduct | null> {
    return this._model.findOne(filter, projection).lean().exec();
  }

  /**
   * Update a product in the database.
   * @param {string} _id - The _id of the product to update.
   * @param {Partial<IRevolicoProduct>} updateData - The data to update the product with.
   * @returns {Promise<IRevolicoProduct | null>} - The updated product document, or null if no product is found.
   */
  public async update(_id: string, updateData: Partial<IRevolicoProduct>): Promise<IRevolicoProduct | null> {
    return this._model.findByIdAndUpdate(_id, { $set: updateData }, { new: true, runValidators: true });
  }

  /**
   * Retrieves a list of products from the database.
   * @param {number} skip - The number of products to skip from the beginning.
   * @param {number} limit - The maximum number of products to retrieve.
   * @param {{ field: string; order: 'asc' | 'desc' }} [sort={ field: 'updatedAt', order: 'desc' }] - The field to sort by and the order.
   * @param {RootFilterQuery<IRevolicoProduct>} [filter] - A filter to apply to the query.
   * @returns {Promise<IRevolicoProduct[]>} - A promise that resolves with an array of products.
   */
  public async find(
    skip: number,
    limit: number,
    sort: { field: string; order: 'asc' | 'desc' } = { field: 'createdAt', order: 'asc' },
    filter?: RootFilterQuery<IRevolicoProduct>,
    projection?: Partial<Record<keyof IRevolicoProduct, 1 | 0>>,
  ): Promise<IRevolicoProduct[]> {
    const query = this._model.find(filter || {}, projection || {});

    query.sort({ [sort.field]: sort.order === 'asc' ? 1 : -1 });

    return query.lean().skip(skip).limit(limit).exec();
  }

  /**
   * Returns the count of products in the database that match the given filter.
   * If no filter is provided, returns the total count of products.
   * @param {RootFilterQuery<IRevolicoProduct>} [filter] - The filter to apply on the count query.
   * @returns {Promise<number>} - The count of products that match the filter.
   */
  public async count(filter?: RootFilterQuery<IRevolicoProduct>): Promise<number> {
    return this._model.countDocuments(filter || {}).exec();
  }

  /**
   * Inserts or updates a single product in the database.
   * @param {IRevolicoProduct} product - The product to be inserted or updated.
   * @param {keyof IRevolicoProduct[]} filterFields - The fields to use as filter. Defaults to ['ID'].
   * @returns {Promise<IRevolicoProduct | null>} - The inserted or updated product document, or null if no product is found.
   */
  public async bulkInsertOrUpdate(
    product: IRevolicoProduct,
    filterFields: (keyof IRevolicoProduct)[] = ['ID'],
  ): Promise<IRevolicoProduct | null> {
    const filter: Partial<Record<keyof IRevolicoProduct, any>> = {};

    filterFields.forEach(field => {
      if (product[field]) {
        filter[field] = product[field];
      }
    });

    const update = {
      $set: {
        ID: product.ID,
        category: product.category,
        subcategory: product.subcategory,
        url: product.url,
        cost: product.cost,
        price: product.price,
        currency: product.currency,
        description: product.description,
        isOutstanding: product.isOutstanding,
        imageURL: product.imageURL,
        location: product.location,
        views: product.views,
        seller: product.seller,
      },
      $push: {
        ...(product.price ? { priceHistory: { value: product.price, updatedAt: new Date() } } : {}),
        ...(product.location
          ? {
              locationHistory: {
                location: { state: product.location.state, municipality: `${product.location.municipality}` },
                updatedAt: new Date(),
              },
            }
          : {}),
        ...(product.views ? { viewsHistory: { value: product.views, updatedAt: new Date() } } : {}),
        ...(product.isOutstanding !== undefined ? { isOutstandingHistory: { value: product.isOutstanding, updatedAt: new Date() } } : {}),
      },
    };

    return this._model.findOneAndUpdate(filter, update, { upsert: true, new: true, lean: true, runValidators: true }).exec();
  }
}
