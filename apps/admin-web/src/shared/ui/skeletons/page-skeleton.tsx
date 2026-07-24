/**
 * Page-level skeleton for Suspense fallback.
 * Renders a title placeholder and a card-shaped area to match the page geometry.
 */
export function PageSkeleton(): JSX.Element {
  return (
    <div className="animate-pulse space-y-lg p-4">
      {/* Title placeholder */}
      <div className="h-8 w-48 rounded-sm bg-surface-container-high" />

      {/* Search bar placeholder */}
      <div className="h-9 w-full max-w-xs rounded-sm bg-surface-container-high" />

      {/* Table skeleton */}
      <div className="space-y-sm">
        <div className="h-9 animate-pulse rounded-sm bg-surface-container-high" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-sm bg-surface-container-high" />
        ))}
      </div>
    </div>
  );
}
