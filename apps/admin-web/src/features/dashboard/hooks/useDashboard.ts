import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@shared/api/client';

interface DashboardData {
  totalAccounts: number;
  activeUsers: number;
  productsScraped: number;
  alarmsFiring: number;
}

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardData>('/admin/dashboard');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 min (standard tier)
  });
}
