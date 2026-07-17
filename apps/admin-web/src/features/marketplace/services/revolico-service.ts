import { apiClient } from '@shared/api/client';

// ---------------------------------------------------------------------------
// DTOs — file-local, never imported from src/main/ or swagger.json
// ---------------------------------------------------------------------------

export interface ScraperConfigDTO {
  id: string;
  storeKey: string;
  expression: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScraperConfigListResponseDTO {
  configs: ScraperConfigDTO[];
}

export interface ScraperConfigSingleResponseDTO {
  config: ScraperConfigDTO;
}

export interface CreateScraperConfigPayload {
  storeKey: string;
  expression: string;
}

export interface UpdateScraperConfigPayload {
  expression: string;
}

export interface ScrapeJobPayload {
  category: string;
  subcategory?: string;
  pageNumber?: number;
  totalPages?: number;
}

export interface ScrapeJobResponseDTO {
  jobId: string;
}

// ---------------------------------------------------------------------------
// Service — raw HTTP calls, no transformation
// ---------------------------------------------------------------------------

export const revolicoService = {
  /** Lists all scraper configs. */
  listConfigs(signal?: AbortSignal) {
    return apiClient.get<ScraperConfigListResponseDTO>('revolicos/scraper-configs', {
      signal,
    });
  },

  /** Gets a single scraper config by storeKey. */
  getConfig(storeKey: string, signal?: AbortSignal) {
    return apiClient.get<ScraperConfigSingleResponseDTO>(
      `revolicos/scraper-configs/${encodeURIComponent(storeKey)}`,
      { signal },
    );
  },

  /** Creates a new scraper config. */
  createConfig(data: CreateScraperConfigPayload) {
    return apiClient.post<ScraperConfigSingleResponseDTO>('revolicos/scraper-configs', data);
  },

  /** Updates an existing scraper config. */
  updateConfig(storeKey: string, data: UpdateScraperConfigPayload) {
    return apiClient.put<ScraperConfigSingleResponseDTO>(
      `revolicos/scraper-configs/${encodeURIComponent(storeKey)}`,
      data,
    );
  },

  /** Triggers a manual scraping job. */
  triggerJob(data: ScrapeJobPayload) {
    return apiClient.post<ScrapeJobResponseDTO>('revolicos/scraping/jobs', data);
  },
};
