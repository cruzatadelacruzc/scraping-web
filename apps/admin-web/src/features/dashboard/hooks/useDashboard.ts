import { apiClient } from '@shared/api/client';
import { ENV } from '@shared/config/env';
import { useQuery } from '@tanstack/react-query';

export interface DashboardMetrics {
  productCount: number;
  categoriesBreakdown: { category: string; count: number }[];
  totalAccounts: number;
  totalUsers: number;
  activeSubscriptions: number;
  recentProducts: Record<string, unknown>[];
}

export interface HealthStatus {
  services: { service: string; status: 'connected' | 'error'; error?: string }[];
  timestamp: string;
}

export interface EnrichmentSnapshot {
  startedAt: string;
  totalEnrichments: number;
  enrichmentHashSkips: number;
  enrichmentHashSkipRate: number;
  cacheHits: number;
  cacheHitsRate: number;
  keywordHits: number;
  keywordHitsRate: number;
  llmCalls: number;
  llmPromptCacheHits: number;
  llmPromptCacheHitRate: number;
  costPerMillion: number;
  estimatedCost: number;
  estimatedSavings: number;
}

export function useDashboardMetrics() {
  return useQuery<DashboardMetrics>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardMetrics>('/admin/dashboard');
      return data;
    },
    staleTime: ENV.STALE_TIME_STANDARD,
  });
}

export function useHealthStatus() {
  return useQuery<HealthStatus>({
    queryKey: ['dashboard', 'health'],
    queryFn: async () => {
      const { data } = await apiClient.get<HealthStatus>('/admin/dashboard/health');
      return data;
    },
    staleTime: ENV.STALE_TIME_REALTIME,
    refetchInterval: ENV.STALE_TIME_REALTIME,
  });
}

export function useEnrichmentMetrics() {
  return useQuery<EnrichmentSnapshot>({
    queryKey: ['dashboard', 'enrichment'],
    queryFn: async () => {
      const { data } = await apiClient.get<EnrichmentSnapshot>('/admin/dashboard/enrichment');
      return data;
    },
    staleTime: ENV.STALE_TIME_REALTIME,
    refetchInterval: ENV.STALE_TIME_REALTIME,
  });
}
