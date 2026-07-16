import { apiClient } from '@shared/api/client';

// ---------------------------------------------------------------------------
// DTOs — file-local, never imported from src/main/ or swagger.json
// ---------------------------------------------------------------------------

export interface ScheduleDTO {
  id: string;
  name: string;
  store: string;
  cron: string;
  enabled: boolean;
  jobs: Record<string, unknown>[];
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleListResponseDTO {
  schedules: ScheduleDTO[];
}

export interface ScheduleSingleResponseDTO {
  schedule: ScheduleDTO;
}

export interface CreateSchedulePayload {
  name: string;
  store: string;
  cron: string;
  enabled?: boolean;
  jobs: Record<string, unknown>[];
}

export interface UpdateSchedulePayload {
  name?: string;
  store?: string;
  cron?: string;
  enabled?: boolean;
  jobs?: Record<string, unknown>[];
}

// ---------------------------------------------------------------------------
// Service — raw HTTP calls, no transformation
// ---------------------------------------------------------------------------

export const schedulesService = {
  /** Lists all scraping schedules. */
  list(signal?: AbortSignal) {
    return apiClient.get<ScheduleListResponseDTO>('/admin/scraping-schedules', { signal });
  },

  /** Gets a single scraping schedule by id. */
  getById(id: string, signal?: AbortSignal) {
    return apiClient.get<ScheduleSingleResponseDTO>(`/admin/scraping-schedules/${id}`, { signal });
  },

  /** Creates a new scraping schedule. */
  create(data: CreateSchedulePayload) {
    return apiClient.post<ScheduleSingleResponseDTO>('/admin/scraping-schedules', data);
  },

  /** Updates an existing scraping schedule. */
  update(id: string, data: UpdateSchedulePayload) {
    return apiClient.put<ScheduleSingleResponseDTO>(`/admin/scraping-schedules/${id}`, data);
  },

  /** Deletes a scraping schedule. */
  delete(id: string) {
    return apiClient.delete(`/admin/scraping-schedules/${id}`);
  },

  /** Toggles the enabled flag of a scraping schedule. */
  toggle(id: string) {
    return apiClient.patch<ScheduleSingleResponseDTO>(`/admin/scraping-schedules/${id}/toggle`);
  },
};
