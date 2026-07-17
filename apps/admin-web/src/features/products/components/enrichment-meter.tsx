interface EnrichmentMeterProps {
  enrichedCount: number;
  unenrichedCount: number;
  percent: number;
  isLoading: boolean;
}

export function EnrichmentMeter({
  enrichedCount,
  unenrichedCount,
  percent,
  isLoading,
}: EnrichmentMeterProps): JSX.Element {
  if (isLoading) {
    return (
      <div className="rounded-md border border-outline-variant bg-surface-container p-md">
        <div className="mb-sm h-4 w-32 animate-pulse rounded-sm bg-surface-container-high" />
        <div className="h-4 w-full animate-pulse rounded-sm bg-surface-container-high" />
        <div className="mt-xs h-3 w-24 animate-pulse rounded-sm bg-surface-container-high" />
      </div>
    );
  }

  const total = enrichedCount + unenrichedCount;

  return (
    <div className="rounded-md border border-outline-variant bg-surface-container p-md">
      <div className="mb-sm flex items-center justify-between">
        <span className="text-label-xs font-mono text-on-surface-variant">Enrichment coverage</span>
        <span className="text-body-sm font-mono font-semibold text-on-surface">
          {String(percent)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-sm bg-primary/20">
        <div
          className="h-full rounded-sm bg-primary transition-all duration-300"
          style={{ width: `${String(percent)}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${String(percent)}% of products enriched`}
        />
      </div>
      <p className="mt-xs text-label-xs font-mono text-on-surface-variant">
        {enrichedCount.toLocaleString()} enriched of {total.toLocaleString()} total
      </p>
    </div>
  );
}
