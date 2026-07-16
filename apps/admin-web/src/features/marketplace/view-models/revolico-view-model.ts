/**
 * ViewModel for a Revolico scraper config consumed by the UI.
 * Never raw API DTOs — dates are parsed, fields are UI-oriented.
 */
export interface ScraperConfigViewModel {
  id: string;
  storeKey: string;
  expression: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ViewModel for a manual scraping job trigger request.
 * UI-oriented: numbers are parsed from form inputs.
 */
export interface ScrapeJobFormViewModel {
  category: string;
  subcategory?: string;
  pageNumber?: number;
  totalPages?: number;
}
