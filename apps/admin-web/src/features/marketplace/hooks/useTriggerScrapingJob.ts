import { useRef } from 'react';
import { showRetryToast } from '@shared/ui/mutation-toast';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { ScrapeJobPayload } from '../services/revolico-service';
import { revolicoService } from '../services/revolico-service';

/**
 * Triggers a manual Revolico scraping job.
 * On success: shows 4s success toast with the job id.
 * On error: sticky error toast with Retry action.
 */
export function useTriggerScrapingJob() {
  const mutation = useMutation({
    mutationFn: (data: ScrapeJobPayload) => revolicoService.triggerJob(data),
    onSuccess: (response) => {
      const jobId = response.data.jobId;
      toast.success(`Scraping job enqueued (${jobId})`);
    },
    onError: (error: Error, variables) => {
      showRetryToast(error, () => {
        mutateRef.current(variables);
      });
    },
  });

  const mutateRef = useRef(mutation.mutate);
  mutateRef.current = mutation.mutate;

  return mutation;
}
