import { ChartNoAxesCombined, PackageSearch, SearchX } from 'lucide-react';

const iconMap = {
  ChartNoAxesCombined,
  SearchX,
  PackageSearch,
} as const;

interface EmptyStateProps {
  icon?: keyof typeof iconMap;
  title: string;
  description?: string;
}

/** Centered empty state with icon, title, and optional description. */
export function EmptyState({
  icon = 'PackageSearch',
  title,
  description,
}: EmptyStateProps): JSX.Element {
  const IconComponent = iconMap[icon];

  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-outline-variant bg-surface-container p-md py-xl text-center">
      <IconComponent size={36} className="text-on-surface-variant" aria-hidden="true" />
      <p className="mt-sm text-body-sm text-on-surface">{title}</p>
      {description && <p className="mt-xs text-body-xs text-on-surface-variant">{description}</p>}
    </div>
  );
}
