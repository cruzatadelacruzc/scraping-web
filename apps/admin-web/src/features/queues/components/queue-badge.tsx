import type { BadgeVariant } from '../view-models/queue-view-model';

interface QueueBadgeProps {
  label: string;
  count?: number;
  variant: BadgeVariant;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  primary: 'bg-primary/10 text-primary',
  info: 'bg-info-muted text-info',
  success: 'bg-success-muted text-success',
  danger: 'bg-danger-muted text-danger',
  warning: 'bg-warning-muted text-warning',
  muted: 'bg-surface-container-highest text-on-surface-variant',
};

/** Small status chip used by queue cards and the jobs table. */
export function QueueBadge({ label, count, variant }: QueueBadgeProps): JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-xs rounded-sm px-xs py-0.5 text-label-xs font-mono ${VARIANT_CLASSES[variant]}`}
    >
      {label}
      {count !== undefined && <span className="font-semibold">{count}</span>}
    </span>
  );
}
