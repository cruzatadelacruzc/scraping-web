export interface IProductBase {
  url: string;
  cost?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  /** App-generated metadata (source, schemaVersion, scrapedAt). */
  metadata?: Record<string, unknown>;
  /** User-managed tags for categorization / filtering. */
  tags?: string[];
  /** Structured attributes extracted from description. */
  attributes?: Record<string, unknown>;
  /** Computed analytics metrics. */
  analytics?: Record<string, unknown>;
  /** MD5 hash of the description used for the last enrichment. Prevents re-sending identical descriptions to the LLM. */
  enrichmentHash?: string;
}

export interface IProductDetails {
  location?: { state: string; municipality?: string };
  views?: number;
  seller?: { name?: string; phone?: string; email?: string; whatsapp?: string };
}
