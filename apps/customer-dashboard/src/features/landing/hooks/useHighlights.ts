import { useQuery } from '@tanstack/react-query';
import { highlightsService } from '../services/highlights-service';

export function useHighlights() {
  return useQuery({
    queryKey: ['public', 'highlights'],
    queryFn: ({ signal }) => highlightsService.get(signal),
    staleTime: 5 * 60 * 1000,
  });
}
