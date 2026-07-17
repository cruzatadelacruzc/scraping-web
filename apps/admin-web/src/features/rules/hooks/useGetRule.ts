import { ENV } from '@shared/config/env';
import { useQuery } from '@tanstack/react-query';

import { mapRuleDTOToViewModel } from '../mappers/rule-mapper';
import { rulesService } from '../services/rules-service';

import { ruleKeys } from './query-keys';

/**
 * Fetches a single rule by its key.
 * @param ruleKey - The unique rule key (e.g. "brands").
 */
export function useGetRule(ruleKey: string) {
  return useQuery({
    queryKey: ruleKeys.detail(ruleKey),
    queryFn: async ({ signal }) => {
      const response = await rulesService.getByKey(ruleKey, { signal });
      return mapRuleDTOToViewModel(response.data.rule);
    },
    staleTime: ENV.STALE_TIME_STATIC,
    enabled: ruleKey.length > 0,
  });
}
