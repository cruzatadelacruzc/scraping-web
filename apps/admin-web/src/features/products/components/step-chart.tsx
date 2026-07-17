import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChartSkeleton } from '@shared/ui/skeletons/chart-skeleton';
import { Area, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { StatusHistoryEntryViewModel } from '../view-models/product-history-view-model';

import { EmptyState } from './empty-state';

const STEP_DOMAIN: [number, number] = [0, 1];
const STEP_TICKS = [0, 1];

interface StepChartProps {
  data: StatusHistoryEntryViewModel[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  activeLabel: string;
  inactiveLabel: string;
  activeColor: string;
  /** Accessible description */
  chartDescription: string;
}

const CHART_MARGIN = { top: 8, right: 16, bottom: 4, left: 4 } as const;
const XAXIS_TICK = { fill: '#898781', fontSize: 11, fontFamily: 'JetBrains Mono' } as const;
const XAXIS_AXIS_LINE = { stroke: '#2c2c2a', strokeWidth: 1 } as const;
const TOOLTIP_CURSOR = { fill: 'rgba(255,255,255,0.04)' } as const;

interface StepTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  activeLabel: string;
  inactiveLabel: string;
}

const StepTooltip = memo(function StepTooltipFn({
  active,
  payload,
  label,
  activeLabel,
  inactiveLabel,
}: StepTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const status = payload[0].value === 1 ? activeLabel : inactiveLabel;
  return (
    <div className="rounded-sm border border-outline-variant bg-surface-container-high p-sm shadow-md">
      <p className="mb-xs text-label-xs font-mono text-on-surface-variant">{label ?? ''}</p>
      <p className="text-body-sm font-mono text-on-surface">{status}</p>
    </div>
  );
});

function StepChartInner({
  data,
  isLoading,
  isError,
  onRetry,
  activeLabel,
  inactiveLabel,
  activeColor,
  chartDescription,
}: StepChartProps): JSX.Element {
  const { t } = useTranslation();

  const dotProps = useMemo(() => ({ r: 3, fill: activeColor, strokeWidth: 0 }), [activeColor]);

  // 1. Loading
  if (isLoading) {
    return <ChartSkeleton />;
  }

  // 2. Error
  if (isError) {
    return (
      <div className="rounded-md border border-outline-variant bg-surface-container p-md">
        <div className="flex flex-col items-center justify-center py-xl text-center">
          <p className="text-body-sm text-danger">{t('products.history.error')}</p>
          <button
            onClick={onRetry}
            className="mt-sm rounded-sm bg-danger px-3 py-1 text-xs text-white transition-colors hover:bg-danger/80"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  // 3. Empty
  if (data.length === 0) {
    return (
      <EmptyState
        icon="ChartNoAxesCombined"
        title={t('products.history.empty')}
        description={t('products.history.emptyDesc')}
      />
    );
  }

  // 4. Data
  const chartData = data.map((d) => ({
    time: d.updatedAt.slice(0, 10),
    value: d.value,
  }));

  return (
    <div className="rounded-md border border-outline-variant bg-surface-container p-md">
      <div role="img" aria-label={chartDescription}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={CHART_MARGIN}>
            <XAxis
              dataKey="time"
              tick={XAXIS_TICK}
              axisLine={XAXIS_AXIS_LINE}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis hide domain={STEP_DOMAIN} ticks={STEP_TICKS} />
            <Tooltip
              content={<StepTooltip activeLabel={activeLabel} inactiveLabel={inactiveLabel} />}
              cursor={TOOLTIP_CURSOR}
            />
            <Area
              type="stepAfter"
              dataKey="value"
              fill={activeColor}
              fillOpacity={0.1}
              stroke="none"
            />
            <Line
              type="stepAfter"
              dataKey="value"
              stroke={activeColor}
              strokeWidth={2}
              dot={dotProps}
              isAnimationActive={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Legend labels */}
      <div className="mt-2 flex justify-center gap-lg">
        <div className="flex items-center gap-1">
          <span className="h-2 w-4 rounded-sm" style={{ backgroundColor: activeColor }} />
          <span className="text-label-xs text-on-surface-variant">{activeLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-4 rounded-sm bg-surface-container-high" />
          <span className="text-label-xs text-on-surface-variant">{inactiveLabel}</span>
        </div>
      </div>
    </div>
  );
}

export const StepChart = memo(StepChartInner);
