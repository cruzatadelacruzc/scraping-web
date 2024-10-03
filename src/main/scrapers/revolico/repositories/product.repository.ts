import { DBContext } from '@config/db-config';
import { inject, injectable } from 'inversify';
import productModel, { IRevolicoProduct } from '../models/product.model';
import { InsertManyOptions, InsertManyResult, Model } from 'mongoose';

export interface CustomInsertManyOptions extends InsertManyOptions {
  // Otras configuraciones personalizadas que desees agregar
}
export interface CustomInsertManyResult {
  acknowledged: boolean;
  insertedCount?: number;
  insertedIds?: Record<number, any>;
  errors?: Error[];
}
@injectable()
export class ProductRepository {
  private readonly _model: Model<IRevolicoProduct>;

  constructor(@inject(DBContext) private readonly _dbContext: DBContext) {
    // this._model = _dbContext.db.model<IRevolicoProduct>('Product', productModel);
    // this._model = _dbContext.product;
    this._model = productModel;
  }

  /**
   * Creates a new product in the database.
   * @param entity Partial entity of IRevolicoProduct
   * @returns The created product document
   */
  async create(entity: Partial<IRevolicoProduct>) {
    return this._model.create(entity);
  }

  /**
   *Finds a product by its ID.
   *@param {string} id - The ID of the product to retrieve.
   *@returns {Promise<IRevolicoProduct | null>} - Returns the found product or null if not found.
   */
  async findOne(id: IRevolicoProduct['_id']): Promise<IRevolicoProduct | null> {
    return this._model
      .findById(id)
      .then(entity => entity)
      .catch(() => {
        return null;
      });
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
   * Insert many products in the database.
   * @param options Additional options for the insertMany operation
   */
  async createMany(data: IRevolicoProduct[], options: CustomInsertManyOptions = {}): Promise<CustomInsertManyResult | IRevolicoProduct[]> {
    const insertOptions: CustomInsertManyOptions = {
      ordered: false,
      ...options,
    };
    try {
      const result = (await this._model.insertMany(data, insertOptions)) as IRevolicoProduct[] | InsertManyResult<IRevolicoProduct>;

      if (insertOptions.rawResult) {
        if (insertOptions.rawResult && 'acknowledged' in result) {
          const insertResult = result as InsertManyResult<IRevolicoProduct>;
          return {
            acknowledged: insertResult.acknowledged,
            insertedCount: insertResult.insertedCount,
            insertedIds: insertResult.insertedIds,
            errors: insertResult.mongoose?.validationErrors,
          };
        }
      }
      return result as IRevolicoProduct[];
    } catch (error) {
      if (insertOptions.rawResult) {
        return {
          acknowledged: false,
          insertedCount: 0,
          insertedIds: {},
          errors: [error as Error],
        };
      }
      throw error;
    }
  }
}
