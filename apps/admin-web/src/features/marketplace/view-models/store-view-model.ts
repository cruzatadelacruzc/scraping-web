/** What the UI consumes — never raw API DTOs. */

export interface StoreViewModel {
  /** Unique store identifier (e.g. "revolico"). */
  key: string;
  /** Human-readable label (e.g. "Revolico"). */
  displayName: string;
  /** BullMQ queue name for scraping jobs. */
  scrapingQueue: string;
  /** Job schema fields rendered read-only in the store card. */
  jobSchema: {
    fields: FieldSchemaViewModel[];
  };
}

export interface FieldSchemaViewModel {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  label: string;
  placeholder?: string;
}
