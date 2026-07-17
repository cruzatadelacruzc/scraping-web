interface ChartSkeletonProps {
  /** Height of the chart area in pixels (default 240) */
  height?: number;
  /** Number of fake bars/lines to render as shimmer (default 8) */
  bars?: number;
}

/**
 * Shape-matched chart skeleton.
 * Renders a container with faux axis labels and shimmer bars that match
 * chart geometry rather than a generic box.
 */
export function ChartSkeleton({ height = 240, bars = 8 }: ChartSkeletonProps): JSX.Element {
  return (
    <div
      className="rounded-md border border-outline-variant bg-surface-container p-md"
      role="status"
      aria-label="Loading chart"
    >
      {/* Title placeholder */}
      <div className="mb-md h-4 w-40 animate-pulse rounded-sm bg-surface-container-high" />
      {/* Chart area */}
      <div
        className="flex items-end gap-2 animate-pulse"
        style={{ height: `${String(height - 60)}px` }}
      >
        {/* Y-axis label placeholders */}
        <div className="flex h-full flex-col justify-between py-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-2 w-8 rounded-sm bg-surface-container-high" />
          ))}
        </div>
        {/* Bars */}
        {Array.from({ length: bars }, (_, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-surface-container-high"
            style={{
              height: `${String(30 + ((i * 17) % 60))}%`,
              opacity: Math.max(0.3, 1 - i * 0.08),
            }}
          />
        ))}
      </div>
      {/* X-axis label placeholder */}
      <div className="mt-2 flex justify-between">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-2 w-12 animate-pulse rounded-sm bg-surface-container-high" />
        ))}
      </div>
    </div>
  );
}
