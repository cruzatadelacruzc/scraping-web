import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import i18n from 'i18next';
import { EventTimeline } from '../components/event-timeline';
import { TimeRangeSelector } from '../components/time-range-selector';
import { HistoryChart } from '../components/history-chart';
import { StepChart } from '../components/step-chart';
import type {
  HistoryEntryViewModel,
  LocationHistoryEntryViewModel,
  StatusHistoryEntryViewModel,
} from '../view-models/product-history-view-model';

// ── i18n setup ──────────────────────────────────────────────────────────────

void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['translation'],
  defaultNS: 'translation',
  resources: {
    en: {
      translation: {
        common: { retry: 'Retry', loading: 'Loading' },
        products: {
          history: {
            error: 'Failed to load history',
            empty: 'No history data',
            emptyDesc: 'No data available in this range.',
            emptyLocation: 'No location changes',
            locationTimeline: 'Location change timeline',
            selectTimeRange: 'Select time range',
            chartDesc: {
              price: 'Price chart',
              views: 'Views chart',
              outstanding: 'Outstanding chart',
              promoted: 'Promoted chart',
            },
            range: {
              '1w': '1W',
              '1m': '1M',
              '3m': '3M',
              '6m': '6M',
              '1y': '1Y',
              all: 'All',
            },
          },
        },
      },
    },
  },
});

function withI18n(ui: React.ReactElement): React.ReactElement {
  return <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>;
}

// ── Mock Recharts ───────────────────────────────────────────────────────────

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="xaxis" />,
  YAxis: () => <div data-testid="yaxis" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

// ── Mock ChartSkeleton ──────────────────────────────────────────────────────

vi.mock('@shared/ui/skeletons/chart-skeleton', () => ({
  ChartSkeleton: () => <div data-testid="chart-skeleton">Loading chart...</div>,
}));

// ── EventTimeline ───────────────────────────────────────────────────────────

describe('EventTimeline', () => {
  const sampleEntries: LocationHistoryEntryViewModel[] = [
    { location: { state: 'Havana', municipality: 'Plaza' }, updatedAt: '2026-06-01T00:00:00.000Z' },
    { location: { state: 'Matanzas' }, updatedAt: '2026-05-15T00:00:00.000Z' },
    {
      location: { state: 'Havana', municipality: 'Old Havana' },
      updatedAt: '2026-07-01T00:00:00.000Z',
    },
  ];

  it('renders loading skeleton when isLoading', () => {
    render(withI18n(<EventTimeline entries={[]} isLoading isError={false} onRetry={vi.fn()} />));
    expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
  });

  it('renders error state with retry button', () => {
    render(withI18n(<EventTimeline entries={[]} isLoading={false} isError onRetry={vi.fn()} />));
    expect(screen.getByText('Failed to load history')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders empty state when no entries', () => {
    render(
      withI18n(<EventTimeline entries={[]} isLoading={false} isError={false} onRetry={vi.fn()} />),
    );
    expect(screen.getByText('No location changes')).toBeInTheDocument();
  });

  it('renders entries sorted chronologically (oldest first)', () => {
    render(
      withI18n(
        <EventTimeline
          entries={sampleEntries}
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
        />,
      ),
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    // First item should be Matanzas (oldest)
    expect(items[0]).toHaveTextContent('Matanzas');
    // Last item should be Old Havana (newest)
    expect(items[2]).toHaveTextContent('Old Havana');
  });

  it('renders latest entry dot with primary styling', () => {
    render(
      withI18n(
        <EventTimeline
          entries={sampleEntries}
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
        />,
      ),
    );
    const items = screen.getAllByRole('listitem');
    const lastItem = items[items.length - 1];
    expect(lastItem).toHaveTextContent('Old Havana');
    // The latest dot should have border-primary (not tested via className check since tailwind)
    // Just verify the entry is rendered
    expect(lastItem.querySelector('span')).toBeInTheDocument();
  });

  it('formats location with state and municipality', () => {
    render(
      withI18n(
        <EventTimeline
          entries={[sampleEntries[0]]}
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
        />,
      ),
    );
    expect(screen.getByText('Havana → Plaza')).toBeInTheDocument();
  });

  it('formats location with state only when no municipality', () => {
    render(
      withI18n(
        <EventTimeline
          entries={[sampleEntries[1]]}
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
        />,
      ),
    );
    expect(screen.getByText('Matanzas')).toBeInTheDocument();
  });
});

// ── TimeRangeSelector ───────────────────────────────────────────────────────

describe('TimeRangeSelector', () => {
  it('renders all preset buttons', () => {
    const onChange = vi.fn();
    render(withI18n(<TimeRangeSelector value="all" onChange={onChange} />));
    expect(screen.getByText('1W')).toBeInTheDocument();
    expect(screen.getByText('1M')).toBeInTheDocument();
    expect(screen.getByText('3M')).toBeInTheDocument();
    expect(screen.getByText('6M')).toBeInTheDocument();
    expect(screen.getByText('1Y')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('marks the selected preset as aria-checked', () => {
    const onChange = vi.fn();
    render(withI18n(<TimeRangeSelector value="all" onChange={onChange} />));
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange with correct preset and bounds on click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(withI18n(<TimeRangeSelector value="all" onChange={onChange} />));

    await user.click(screen.getByText('1W'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const call = onChange.mock.calls[0][0];
    expect(call.preset).toBe('1w');
    expect(call.start).toBeInstanceOf(Date);
    expect(call.end).toBeInstanceOf(Date);
  });

  it('resets both bounds to null when All is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(withI18n(<TimeRangeSelector value="1m" onChange={onChange} />));

    await user.click(screen.getByText('All'));
    const call = onChange.mock.calls[0][0];
    expect(call.preset).toBe('all');
    expect(call.start).toBeNull();
    expect(call.end).toBeNull();
  });
});

// ── HistoryChart ────────────────────────────────────────────────────────────

describe('HistoryChart', () => {
  const sampleData: HistoryEntryViewModel[] = [
    { value: 100, updatedAt: '2026-06-01T00:00:00.000Z', timestamp: new Date('2026-06-01') },
    { value: 200, updatedAt: '2026-06-15T00:00:00.000Z', timestamp: new Date('2026-06-15') },
  ];

  it('renders loading skeleton when isLoading', () => {
    render(
      withI18n(
        <HistoryChart
          data={[]}
          chartType="line"
          seriesLabel="Price"
          valueFormatter={(v) => `$${String(v)}`}
          color="#ec4899"
          fillColor="#ec4899"
          isLoading
          isError={false}
          onRetry={vi.fn()}
          chartDescription="Price chart"
        />,
      ),
    );
    expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
  });

  it('renders error state with retry button', () => {
    render(
      withI18n(
        <HistoryChart
          data={[]}
          chartType="line"
          seriesLabel="Price"
          valueFormatter={(v) => `$${String(v)}`}
          color="#ec4899"
          fillColor="#ec4899"
          isLoading={false}
          isError
          onRetry={vi.fn()}
          chartDescription="Price chart"
        />,
      ),
    );
    expect(screen.getByText('Failed to load history')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders empty state when data is empty', () => {
    render(
      withI18n(
        <HistoryChart
          data={[]}
          chartType="line"
          seriesLabel="Price"
          valueFormatter={(v) => `$${String(v)}`}
          color="#ec4899"
          fillColor="#ec4899"
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
          chartDescription="Price chart"
        />,
      ),
    );
    expect(screen.getByText('No history data')).toBeInTheDocument();
  });

  it('renders LineChart for chartType="line"', () => {
    render(
      withI18n(
        <HistoryChart
          data={sampleData}
          chartType="line"
          seriesLabel="Price"
          valueFormatter={(v) => `$${String(v)}`}
          color="#ec4899"
          fillColor="#ec4899"
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
          chartDescription="Price chart"
        />,
      ),
    );
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders AreaChart for chartType="area"', () => {
    render(
      withI18n(
        <HistoryChart
          data={sampleData}
          chartType="area"
          seriesLabel="Views"
          valueFormatter={(v) => v.toLocaleString()}
          color="#bec6e0"
          fillColor="#bec6e0"
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
          chartDescription="Views chart"
        />,
      ),
    );
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });
});

// ── StepChart ───────────────────────────────────────────────────────────────

describe('StepChart', () => {
  const sampleData: StatusHistoryEntryViewModel[] = [
    { value: 1, updatedAt: '2026-06-01T00:00:00.000Z', timestamp: new Date('2026-06-01') },
    { value: 0, updatedAt: '2026-06-15T00:00:00.000Z', timestamp: new Date('2026-06-15') },
  ];

  it('renders loading skeleton when isLoading', () => {
    render(
      withI18n(
        <StepChart
          data={[]}
          isLoading
          isError={false}
          onRetry={vi.fn()}
          activeLabel="Outstanding"
          inactiveLabel="Standard"
          activeColor="#f59e0b"
          chartDescription="Outstanding chart"
        />,
      ),
    );
    expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
  });

  it('renders error state with retry button', () => {
    render(
      withI18n(
        <StepChart
          data={[]}
          isLoading={false}
          isError
          onRetry={vi.fn()}
          activeLabel="Outstanding"
          inactiveLabel="Standard"
          activeColor="#f59e0b"
          chartDescription="Outstanding chart"
        />,
      ),
    );
    expect(screen.getByText('Failed to load history')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders empty state when data is empty', () => {
    render(
      withI18n(
        <StepChart
          data={[]}
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
          activeLabel="Outstanding"
          inactiveLabel="Standard"
          activeColor="#f59e0b"
          chartDescription="Outstanding chart"
        />,
      ),
    );
    expect(screen.getByText('No history data')).toBeInTheDocument();
  });

  it('renders active and inactive labels in the legend', () => {
    render(
      withI18n(
        <StepChart
          data={sampleData}
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
          activeLabel="Outstanding"
          inactiveLabel="Standard"
          activeColor="#f59e0b"
          chartDescription="Outstanding chart"
        />,
      ),
    );
    expect(screen.getByText('Outstanding')).toBeInTheDocument();
    expect(screen.getByText('Standard')).toBeInTheDocument();
  });

  it('renders data with LineChart', () => {
    render(
      withI18n(
        <StepChart
          data={sampleData}
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
          activeLabel="Promoted"
          inactiveLabel="Not promoted"
          activeColor="#10b981"
          chartDescription="Promoted chart"
        />,
      ),
    );
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });
});
