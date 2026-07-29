import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

/** Shape-matched loading placeholder. Use instead of spinners. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-surface-container-high', className)}
      {...props}
    />
  );
}
