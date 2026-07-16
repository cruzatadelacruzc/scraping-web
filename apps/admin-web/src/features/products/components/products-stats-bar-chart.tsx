import { useTranslation } from 'react-i18next';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface BarItem {
  name: string;
  value: number;
}

interface ProductsStatsBarChartProps {
  title: string;
  data: BarItem[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  /** Accessible sr-only description of what this chart shows */
  chartDescription: string;
}

const CHART_BAR_FILL = 'fill-primary/60';

const CHART_MARGIN = { top: 4, right: 16, bottom: 4, left: 0 } as const;
const XAXIS_TICK = { fill: '#898781', fontSize: 11, fontFamily: 'JetBrains Mono' } as const;
const XAXIS_AXIS_LINE = { stroke: '#2c2c2a', strokeWidth: 1 } as const;
const YAXIS_TICK = { fill: '#d4e4fa', fontSize: 12 } as const;
const TOOLTIP_CURSOR = { fill: 'rgba(255,255,255,0.04)' } as const;
const BAR_RADIUS: [number, number, number, number] = [0, 4, 4, 0];

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const item = payload[0];
  return (
    <div className="rounded-sm border border-outline-variant bg-surface-container-high p-sm shadow-md">
      <p className="text-label-xs font-mono text-on-surface-variant">{item.name}</p>
      <p className="text-body-sm font-mono font-semibold text-on-surface">
        {item.value.toLocaleString()}
      </p>
    </div>
  );
};

export function ProductsStatsBarChart({
  title,
  data,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  chartDescription,
}: ProductsStatsBarChartProps): JSX.Element {
  const { t } = useTranslation();
  // 1. Loading: chart-shaped skeleton
  if (isLoading) {
    return (
      <div className="rounded-md border border-outline-variant bg-surface-container p-md">
        <div className="mb-md h-4 w-40 animate-pulse rounded-sm bg-surface-container-high" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-3 w-20 animate-pulse rounded-sm bg-surface-container-high" />
              <div
                className="h-3 animate-pulse rounded-sm bg-surface-container-high"
                style={{ width: `${String(40 + i * 10)}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Error
  if (isError) {
    return (
      <div className="rounded-md border border-outline-variant bg-surface-container p-md">
        <h3 className="mb-md text-body-sm font-semibold text-on-surface">{title}</h3>
        <div className="rounded-sm border border-danger bg-danger-muted p-sm text-sm">
          <p className="text-danger">{errorMessage ?? 'Failed to load chart data'}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-sm rounded-sm bg-danger px-3 py-1 text-xs text-white transition-colors hover:bg-danger/80"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. Empty
  if (data.length === 0) {
    return (
      <div className="rounded-md border border-outline-variant bg-surface-container p-md">
        <h3 className="mb-md text-body-sm font-semibold text-on-surface">{title}</h3>
        <div className="flex flex-col items-center justify-center py-xl text-center">
          <svg
            width={36}
            height={36}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="text-on-surface-variant"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          </svg>
          <p className="mt-sm text-body-sm text-on-surface-variant">
            {t('products.stats.chartEmpty')}
          </p>
        </div>
      </div>
    );
  }

  // 4. Data: horizontal bar chart
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  return (
    <div className="rounded-md border border-outline-variant bg-surface-container p-md">
      <h3 className="mb-md text-body-sm font-semibold text-on-surface">{title}</h3>
      <div role="img" aria-label={chartDescription}>
        <ResponsiveContainer width="100%" height={Math.max(200, sortedData.length * 40)}>
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={CHART_MARGIN}
            barCategoryGap={4}
            barGap={2}
          >
            <XAxis type="number" tick={XAXIS_TICK} axisLine={XAXIS_AXIS_LINE} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={YAXIS_TICK}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip content={<CustomTooltip />} cursor={TOOLTIP_CURSOR} />
            <Bar
              dataKey="value"
              radius={BAR_RADIUS}
              maxBarSize={20}
              isAnimationActive={false}
              className={CHART_BAR_FILL}
              stroke="none"
            >
              {sortedData.map((entry, index) => (
                <Cell
                  key={entry.name}
                  className={CHART_BAR_FILL}
                  stroke={index === 0 ? '#ffb0cd' : 'none'}
                  strokeWidth={index === 0 ? 1 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
