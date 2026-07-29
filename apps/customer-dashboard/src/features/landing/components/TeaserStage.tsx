import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/utils/cn';
import { Skeleton } from '@/shared/ui/skeleton';
import { Sparkline } from './Sparkline';
import { useHighlights } from '../hooks/useHighlights';
import type { TeaserItem, TeaserSlide } from '../types';

const ROTATE_MS = 7000;

const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' });

function LeaderboardRow({
  item,
  rank,
  highlighted,
}: {
  item: TeaserItem;
  rank: number;
  highlighted: boolean;
}) {
  return (
    <li className="relative overflow-hidden rounded-md border border-outline-variant/60 bg-surface-container-low">
      {/* magnitude bar: width encodes the drop % */}
      <div
        className="absolute inset-y-0 left-0 bg-success/10"
        style={{ width: `${Math.min(item.dropPct, 100)}%` }}
        aria-hidden="true"
      />
      <div className="relative flex items-center gap-3 px-3 py-2.5">
        <span className="w-6 shrink-0 font-mono text-xs text-on-surface-variant">
          {String(rank).padStart(2, '0')}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-on-surface">{item.name}</span>
        <span className="shrink-0 rounded bg-success/15 px-1.5 py-0.5 font-mono text-xs font-medium text-success">
          −{item.dropPct}%
        </span>
        <span className="hidden w-28 shrink-0 text-right font-mono text-xs leading-tight sm:block">
          <span className="block text-on-surface-variant line-through">
            {currency.format(item.oldPrice)}
          </span>
          <span
            className={cn('block font-semibold', highlighted ? 'text-success' : 'text-on-surface')}
          >
            {currency.format(item.newPrice)}
          </span>
        </span>
        <Sparkline
          data={item.spark}
          className={cn(
            'hidden shrink-0 md:block',
            highlighted ? 'text-success' : 'text-on-surface-variant'
          )}
        />
      </div>
    </li>
  );
}

function Dots({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5" role="tablist" aria-label="slides">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all',
            i === active ? 'w-4 bg-success' : 'w-1.5 bg-outline-variant'
          )}
        />
      ))}
    </div>
  );
}

export function TeaserStage() {
  const { t } = useTranslation('landing');
  const { data, isLoading, isError, refetch } = useHighlights();
  const [active, setActive] = useState(0);

  const slides: TeaserSlide[] = useMemo(() => data?.slides ?? [], [data]);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setActive((a) => (a + 1) % slides.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  if (isLoading) {
    return (
      <div className="mx-auto flex h-full max-w-3xl flex-col gap-3">
        <Skeleton className="h-5 w-48" />
        <div className="flex flex-1 flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || slides.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-on-surface-variant">
        <p>{t('common:states.error', { defaultValue: 'Something went wrong' })}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-md border border-outline-variant px-3 py-1 text-on-surface hover:bg-surface-container-high"
        >
          {t('common:actions.retry', { defaultValue: 'Retry' })}
        </button>
      </div>
    );
  }

  const slide = slides[active];

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col justify-center">
      <div className="mb-3 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold text-on-surface">{slide.title}</h1>
        <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
          {t('teaser.updatedToday')}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {slide.items.map((item, i) => (
          <LeaderboardRow key={item.productId} item={item} rank={i + 1} highlighted={i === 0} />
        ))}
      </ul>

      <div className="pt-4">
        <Dots count={slides.length} active={active} />
      </div>
    </div>
  );
}
