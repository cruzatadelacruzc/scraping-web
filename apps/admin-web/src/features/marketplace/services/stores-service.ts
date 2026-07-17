import { apiClient } from '@shared/api/client';

// ---------------------------------------------------------------------------
// DTOs — file-local, never imported from src/main/ or swagger.json
// ---------------------------------------------------------------------------

export interface FieldSchemaDTO {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  label: string;
  placeholder?: string;
}

export interface StoreDTO {
  key: string;
  displayName: string;
  scrapingQueue: string;
  jobSchema: {
    fields: FieldSchemaDTO[];
  };
}

export interface StoreListResponse {
  stores: StoreDTO[];
}

// ---------------------------------------------------------------------------
// Service — raw HTTP calls, no transformation
// ---------------------------------------------------------------------------

export const storesService = {
  /** Lists all registered stores. */
  list(signal?: AbortSignal) {
    return apiClient.get<StoreListResponse>('/admin/stores', { signal });
  },
};
