import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { HighlightsResponse } from '../types';

export const highlightsService = {
  async get(signal?: AbortSignal): Promise<HighlightsResponse> {
    const res = await apiClient.get<HighlightsResponse>(ENDPOINTS.PUBLIC.HIGHLIGHTS, { signal });
    return res.data;
  },
};
