import crypto from 'crypto';
import { inject, injectable } from 'inversify';
import { DBContext } from '@config/db-config';
import { model, Schema, type Model } from 'mongoose';

// ---- Mongoose sub-model for keyword_cache collection -----------------------
interface IKeywordCacheEntry {
  _id: string;
  keywords: string[];
  createdAt: Date;
}

const keywordCacheSchema = new Schema<IKeywordCacheEntry>(
  {
    _id: { type: String },
    keywords: { type: [String], required: true },
    createdAt: { type: Date, default: (): Date => new Date() },
  },
  { timestamps: false },
);

// Index is created lazily on first use (see ensureIndex below).

/**
 * Two-layer keywords cache: in-memory Map + MongoDB collection with TTL index.
 *
 * - Layer 1 (memory): sub-millisecond lookup for the process lifetime.
 * - Layer 2 (MongoDB): survives restarts; entries expire after TTL days.
 *
 * Key: MD5 hex of description.trim().toLowerCase() — deterministic, fast,
 *      same description across scrapes → same key.
 *
 * @class KeywordsCache
 */
@injectable()
export class KeywordsCache {
  private readonly _memory = new Map<string, string[]>();
  private _model: Model<IKeywordCacheEntry> | null = null;
  private _indexEnsured = false;

  public constructor(@inject(DBContext) private readonly _db: DBContext) {}

  // ---- lazy model ----------------------------------------------------------

  private _getModel(): Model<IKeywordCacheEntry> {
    if (!this._model) {
      this._model = model<IKeywordCacheEntry>('KeywordCache', keywordCacheSchema, 'keyword_cache');
    }
    return this._model;
  }

  private async _ensureIndex(): Promise<void> {
    if (this._indexEnsured) return;
    const ttlSeconds = (Number(process.env.LLM_CACHE_TTL_DAYS) || 30) * 24 * 3600;
    await this._getModel().collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: ttlSeconds, background: true });
    this._indexEnsured = true;
  }

  // ---- public API ----------------------------------------------------------

  /**
   * Builds the canonical cache key for a description.
   */
  public static hash(description: string): string {
    return crypto.createHash('md5').update(description.trim().toLowerCase()).digest('hex');
  }

  /**
   * Looks up cached keywords for a description. Checks memory first, then
   * MongoDB. Promotes Mongo hits to memory automatically.
   *
   * @returns {Promise<string[] | null>} Keywords or null on miss.
   */
  public async get(description: string): Promise<string[] | null> {
    const key = KeywordsCache.hash(description);
    const mem = this._memory.get(key);
    if (mem) return mem;

    try {
      await this._ensureIndex();
      const doc = await this._getModel().findById(key).lean().exec();
      if (doc?.keywords?.length) {
        this._memory.set(key, doc.keywords);
        return doc.keywords;
      }
    } catch {
      // Mongo unavailable — memory-only mode.
    }

    return null;
  }

  /**
   * Stores keywords for a description in both memory and MongoDB.
   * MongoDB write failures are silently swallowed (cache is best-effort).
   */
  public async set(description: string, keywords: string[]): Promise<void> {
    const key = KeywordsCache.hash(description);
    this._memory.set(key, keywords);

    try {
      await this._ensureIndex();
      await this._getModel()
        .findByIdAndUpdate(key, { $set: { keywords, createdAt: new Date() } }, { upsert: true, lean: true })
        .exec();
    } catch {
      // Mongo write failed — memory still has it for this process lifetime.
    }
  }
}
