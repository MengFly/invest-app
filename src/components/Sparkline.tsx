import { colors } from '@/theme';

interface SparklineProps {
  points: number[];
  up: boolean;
  width?: number;
  height?: number;
}

export function Sparkline({ points, up, width = 64, height = 28 }: SparklineProps) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const stroke = up ? colors.profit : colors.loss;

  const polylinePoints = points
    .map((p, i) => {
      const x = i * stepX;
      const y = height - ((p - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={polylinePoints}
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
