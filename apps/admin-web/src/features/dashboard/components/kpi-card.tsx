interface Props {
  label: string;
  value: number;
  delta?: number;
  isLoading?: boolean;
}

export function KpiCard({ label, value, delta, isLoading }: Props): JSX.Element {

  if (isLoading) {
    return (
      <div
        data-testid="kpi-skeleton"
        className="animate-pulse rounded-md border border-outline-variant bg-surface-container p-md"
      >
        <div className="mb-sm h-3 w-20 rounded-sm bg-surface-container-high" />
        <div className="h-6 w-16 rounded-sm bg-surface-container-high" />
      </div>
    );
  }

  return (
    <div className="rounded-md border border-outline-variant bg-surface-container p-md">
      <p className="text-label-md font-mono text-on-surface-variant">{label}</p>
      <div className="mt-xs flex items-baseline gap-sm">
        <span className="text-headline-lg-mobile font-semibold text-on-surface">
          {value.toLocaleString()}
        </span>
        {delta !== undefined && delta !== 0 && (
          <span
            className={`text-body-sm font-mono ${
              delta > 0 ? 'text-success' : 'text-danger'
            }`}
          >
            {delta > 0 ? '+' : ''}
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
