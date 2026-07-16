import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export type PresetRange = '1w' | '1m' | '3m' | '6m' | '1y' | 'all';

interface TimeRangeSelectorProps {
  value: PresetRange;
  onChange: (range: { start: Date | null; end: Date | null; preset: PresetRange }) => void;
}

function computeBounds(preset: PresetRange): {
  start: Date | null;
  end: Date | null;
} {
  const now = new Date();
  switch (preset) {
    case '1w': {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { start, end: now };
    }
    case '1m': {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      return { start, end: now };
    }
    case '3m': {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      return { start, end: now };
    }
    case '6m': {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 6);
      return { start, end: now };
    }
    case '1y': {
      const start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      return { start, end: now };
    }
    case 'all':
    default:
      return { start: null, end: null };
  }
}

const presets: { value: PresetRange; labelKey: string }[] = [
  { value: '1w', labelKey: 'products.history.range.1w' },
  { value: '1m', labelKey: 'products.history.range.1m' },
  { value: '3m', labelKey: 'products.history.range.3m' },
  { value: '6m', labelKey: 'products.history.range.6m' },
  { value: '1y', labelKey: 'products.history.range.1y' },
  { value: 'all', labelKey: 'products.history.range.all' },
];

function TimeRangeSelectorInner({ value, onChange }: TimeRangeSelectorProps): JSX.Element {
  const { t } = useTranslation();

  const handlePresetClick = useCallback(
    (preset: PresetRange) => {
      const bounds = computeBounds(preset);
      onChange({ ...bounds, preset });
    },
    [onChange],
  );

  return (
    <div
      className="flex flex-wrap gap-1"
      role="radiogroup"
      aria-label={t('products.history.selectTimeRange')}
    >
      {presets.map((preset) => {
        const isSelected = value === preset.value;
        return (
          <button
            key={preset.value}
            role="radio"
            aria-checked={isSelected}
            onClick={() => {
              handlePresetClick(preset.value);
            }}
            className={`rounded-sm px-3 py-1 text-label-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-void-black ${
              isSelected
                ? 'bg-primary text-white'
                : 'border border-outline-variant text-on-surface-variant hover:border-primary hover:text-on-surface'
            }`}
          >
            {t(preset.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

export const TimeRangeSelector = memo(TimeRangeSelectorInner);
