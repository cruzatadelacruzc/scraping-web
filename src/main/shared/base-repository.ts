import { Document, Model, RootFilterQuery, UpdateQuery } from 'mongoose';

export abstract class BaseRepository<T extends Document> {
  private model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  /**
   * Save or update a {@link Document}
   *
   * @param {Partial<T>} data - Data to create or update a {@link Document}
   * @returns {Promise<T>} - Returns the created or updated {@link Document}
   */
  async save(data: Partial<T>): Promise<T> {
    const { _id, ...rest } = data;
    if (_id) {
      return this.model
        .findOneAndUpdate({ _id }, rest as UpdateQuery<T>, {
          new: true,
          upsert: true,
        })
        .exec();
    }
    const document = new this.model(data);
    return await document.save();
  }

  /**
   * Searches the database for documents that match the specified query.
   *
   * @param {RootFilterQuery<T>} query - query to search for documents.
   * @returns {Promise<T[]>} - Returns an array of documents that match the query.
   */
  async findByQuery(query: RootFilterQuery<T>): Promise<T[]> {
    return this.model.find(query).exec();
  }

  /**
   * Search for a document in the database by its ID.
   *
   * @param {string} id - ID of the document to search for.
   * @returns {Promise<T | null>} - Returns the document if found, or `null` if not.
   */
  async findById(id: string): Promise<T | null> {
    return await this.model.findById(id);
  }

  /**
   * Recover all documents in the collection.
   *
   * @returns {Promise<T[]>} - Returns an array of all documents in the collection.
   */
  async findAll(): Promise<T[]> {
    return this.model.find().exec();
  }

  /**
   * Deletes a document from the database by its ID.
   *
   * @param {string} id - The ID of the document to delete.
   * @returns {Promise<void>} - Returns a promise that resolves when the document has been deleted.
   */
  async deleteById(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
  }
}
