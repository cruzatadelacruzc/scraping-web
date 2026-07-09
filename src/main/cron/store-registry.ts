/**
 * Describes a single field in a store's job schema, used by the admin
 * dashboard to dynamically render scraping-job forms per store.
 */
export interface IFieldSchema {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  label: string;
  placeholder?: string;
}

/**
 * Configuration a store module publishes at bootstrap so the cron scheduler
 * (and the admin API) know how to route scraping jobs and render their forms.
 */
export interface IStoreConfig {
  /** Human-readable label shown in the admin UI (e.g. "Revolico"). */
  displayName: string;
  /** BullMQ queue name where scraping jobs for this store are enqueued. */
  scrapingQueue: string;
  /** Field descriptors for the admin dashboard dynamic form. */
  jobSchema: {
    fields: IFieldSchema[];
  };
}

/**
 * In-memory registry that maps a store key (e.g. "revolico") to its
 * {@link IStoreConfig}. Each store module calls {@link StoreRegistry.register}
 * at bootstrap. The cron scheduler and the admin stores endpoint read from
 * this registry.
 */
export class StoreRegistry {
  private readonly _stores = new Map<string, IStoreConfig>();

  /**
   * Registers a store. Throws if the key is already registered.
   *
   * @param storeKey  Unique store identifier (e.g. "revolico").
   * @param config    Queue name, display name, and job form schema.
   */
  public register(storeKey: string, config: IStoreConfig): void {
    if (this._stores.has(storeKey)) {
      throw new Error(`Store "${storeKey}" is already registered`);
    }
    this._stores.set(storeKey, config);
  }

  /**
   * Returns the {@link IStoreConfig} for a given key, or throws if unknown.
   */
  public get(storeKey: string): IStoreConfig {
    const config = this._stores.get(storeKey);
    if (!config) {
      throw new Error(`Unknown store: "${storeKey}"`);
    }
    return config;
  }

  /** Lists all registered stores with their keys. */
  public list(): Array<{ key: string } & IStoreConfig> {
    return Array.from(this._stores.entries()).map(([key, config]) => ({
      key,
      ...config,
    }));
  }
}
