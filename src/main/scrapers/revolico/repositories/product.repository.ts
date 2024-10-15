import { DBContext } from '@config/db-config';
import { inject, injectable } from 'inversify';
import productModel, { IRevolicoProduct } from '../models/product.model';
import { InsertManyOptions, InsertManyResult, Model, MongooseBulkWriteOptions, RootFilterQuery } from 'mongoose';

export interface CustomInsertManyOptions extends InsertManyOptions {
  // Otras configuraciones personalizadas que desees agregar
}
export interface CustomInsertManyResult {
  acknowledged: boolean;
  insertedCount?: number;
  insertedIds?: Record<number, any>;
  errors?: Error[];
}

export interface BulkWriteResultWithErrors {
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

  constructor(@inject(DBContext) private readonly _dbContext: DBContext) {
    this._model = productModel;
  }

  /**
   * Removes all products from the database.
   * @returns A promise that resolves once all products have been removed.
   */
  async clearAll() {
    return this._model.deleteMany({});
  }

  /**
   * Finds a product by its id.
   * @param {string} id - The ID of the product to retrieve.
   * @returns {Promise<IRevolicoProduct | null>} - Returns the found product or null if not found.
   */
  async findOne(
    filter: RootFilterQuery<IRevolicoProduct>,
    projection?: Partial<Record<keyof IRevolicoProduct, 1 | 0>>,
  ): Promise<IRevolicoProduct | null> {
    return this._model.findOne(filter, projection).lean().exec();
  }

  /**
   * Update a product in the database.
   * @param updateData Partial entity of IRevolicoProduct
   * @returns The updated product document
   */
  async update(_id: string, updateData: Partial<IRevolicoProduct>) {
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
  async find(
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
  async count(filter?: RootFilterQuery<IRevolicoProduct>): Promise<number> {
    return this._model.countDocuments(filter || {}).exec();
  }

  async bulkInsertOrUpdate(product: IRevolicoProduct, filterFields: (keyof IRevolicoProduct)[] = ['ID']): Promise<IRevolicoProduct | null> {
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
