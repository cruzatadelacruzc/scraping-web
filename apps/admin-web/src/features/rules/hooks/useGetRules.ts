import { ENV } from '@shared/config/env';
import { useQuery } from '@tanstack/react-query';

import { mapRuleDTOToViewModel } from '../mappers/rule-mapper';
import { rulesService } from '../services/rules-service';

import { ruleKeys } from './query-keys';

/**
 * Fetches all rules and maps them to ViewModels.
 * Stale time: STATIC (30 min) — rules are reference data.
 */
export function useGetRules() {
  return useQuery({
    queryKey: ruleKeys.list({}),
    queryFn: async ({ signal }) => {
      const response = await rulesService.list({ signal });
      return {
        items: response.data.rules.map(mapRuleDTOToViewModel),
        total: response.data.rules.length,
      };
    },
    staleTime: ENV.STALE_TIME_STATIC,
  });
}
