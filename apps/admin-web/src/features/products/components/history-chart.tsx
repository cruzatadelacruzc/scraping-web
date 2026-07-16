import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChartSkeleton } from '@shared/ui/skeletons/chart-skeleton';
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { HistoryEntryViewModel } from '../view-models/product-history-view-model';

import { EmptyState } from './empty-state';

interface HistoryChartProps {
  data: HistoryEntryViewModel[];
  chartType: 'line' | 'area';
  seriesLabel: string;
  valueFormatter: (v: number) => string;
  color: string;
  fillColor: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  /** Accessible description of this chart */
  chartDescription: string;
}

// Recharts style constants (matching Task 3 precedent)
const CHART_MARGIN = { top: 8, right: 16, bottom: 4, left: 4 } as const;
const XAXIS_TICK = { fill: '#898781', fontSize: 11, fontFamily: 'JetBrains Mono' } as const;
const XAXIS_AXIS_LINE = { stroke: '#2c2c2a', strokeWidth: 1 } as const;
const YAXIS_TICK = { fill: '#d4e4fa', fontSize: 12 } as const;
const TOOLTIP_CURSOR = { fill: 'rgba(255,255,255,0.04)' } as const;

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: string;
  valueFormatter: (v: number) => string;
  seriesLabel: string;
}

const CustomTooltip = memo(function CustomTooltipFn({
  active,
  payload,
  label,
  valueFormatter,
  seriesLabel,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const item = payload[0];
  return (
    <div className="rounded-sm border border-outline-variant bg-surface-container-high p-sm shadow-md">
      <p className="mb-xs text-label-xs font-mono text-on-surface-variant">{label ?? ''}</p>
      <p className="text-body-sm font-mono text-on-surface">
        {seriesLabel}: {valueFormatter(item.value)}
      </p>
    </div>
  );
});

function HistoryChartInner({
  data,
  chartType,
  seriesLabel,
  valueFormatter,
  color,
  fillColor,
  isLoading,
  isError,
  onRetry,
  chartDescription,
}: HistoryChartProps): JSX.Element {
  const { t } = useTranslation();

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

  // 4. Data — format for Recharts
  const chartData = data.map((d) => ({
    time: d.updatedAt.slice(0, 10),
    value: d.value,
  }));

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: CHART_MARGIN,
    };

    if (chartType === 'line') {
      return (
        <LineChart {...commonProps}>
          <XAxis
            dataKey="time"
            tick={XAXIS_TICK}
            axisLine={XAXIS_AXIS_LINE}
            tickLine={false}
            minTickGap={30}
          />
          <YAxis
            tick={YAXIS_TICK}
            axisLine={XAXIS_AXIS_LINE}
            tickLine={false}
            width={60}
            tickFormatter={valueFormatter}
          />
          <Tooltip
            content={<CustomTooltip valueFormatter={valueFormatter} seriesLabel={seriesLabel} />}
            cursor={TOOLTIP_CURSOR}
          />
          <Area type="monotone" dataKey="value" fill={fillColor} fillOpacity={0.1} stroke="none" />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
        </LineChart>
      );
    }

    // Area chart
    return (
      <AreaChart {...commonProps}>
        <XAxis
          dataKey="time"
          tick={XAXIS_TICK}
          axisLine={XAXIS_AXIS_LINE}
          tickLine={false}
          minTickGap={30}
        />
        <YAxis
          tick={YAXIS_TICK}
          axisLine={XAXIS_AXIS_LINE}
          tickLine={false}
          width={60}
          tickFormatter={valueFormatter}
        />
        <Tooltip
          content={<CustomTooltip valueFormatter={valueFormatter} seriesLabel={seriesLabel} />}
          cursor={TOOLTIP_CURSOR}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={fillColor}
          fillOpacity={0.1}
          isAnimationActive={false}
          connectNulls={false}
        />
      </AreaChart>
    );
  };

  return (
    <div className="rounded-md border border-outline-variant bg-surface-container p-md">
      <div role="img" aria-label={chartDescription}>
        <ResponsiveContainer width="100%" height={280}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Memoized history chart — stable identity while data doesn't change */
export const HistoryChart = memo(HistoryChartInner);
