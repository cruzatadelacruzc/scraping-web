interface SparklineProps {
  data: number[];
  className?: string;
  width?: number;
  height?: number;
}

/** Minimal inline trend line (SVG, no chart lib) — inherits color via currentColor. */
export function Sparkline({ data, className, width = 64, height = 20 }: SparklineProps) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      fill="none"
      aria-hidden="true"
      className={className}
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
