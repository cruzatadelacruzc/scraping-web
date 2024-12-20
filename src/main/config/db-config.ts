import { IRevolicoProduct, productSchema } from '@scrapers/revolico/models/product.model';
import { injectable } from 'inversify';
import mongoose from 'mongoose';

@injectable()
export class DBContext {
  private _db: typeof mongoose;

  /**
   * Create connection with MongoDB database.
   *
   * @param uri - The URI of the MongoDB database.
   */
  public async dbConnect(): Promise<void> {
    const DB_URI = <string>process.env.DB_URI;
    try {
      this._db = await mongoose.connect(DB_URI);
      console.log('Database connection established.');
    } catch (error) {
      console.error('🔥 ', error);
      throw error;
    }
  }

  public get db(): typeof mongoose {
    if (!this._db) {
      throw new Error('The database connection has not been initialized.');
    }
    return this._db;
  }

  public get product(): mongoose.Model<IRevolicoProduct> {
    return this._db.model<IRevolicoProduct>('products', productSchema);
  }
}
