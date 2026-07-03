import React, { useRef, useState, useLayoutEffect } from 'react';
import { colors } from '@/theme';
import type { NetWorthRecord, ChartCoords } from '@/types';

interface NavChartProps {
  points?: number[];
  netWorths?: NetWorthRecord[];
  width?: number;
  height?: number;
  yLabels?: string[];
  xLabels?: string[];
  overlay?: (coords: ChartCoords) => React.ReactNode;
}

function navToV(nav: number, min: number, max: number): number {
  const range = max - min || 1;
  return 130 - ((nav - min) / range) * 120 + 10;
}

export function NavChart({
  points: pointsProp,
  netWorths,
  height = 180,
  yLabels = ['2.50', '2.45', '2.40', '2.35', '2.30'],
  xLabels = ['06-01', '06-08', '06-15', '06-22', '06-29'],
  overlay,
}: NavChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(320);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const resize = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    resize.observe(containerRef.current);
    return () => resize.disconnect();
  }, []);

  const width = Math.max(containerWidth, 200);

  const padLeft = 40;
  const padRight = 10;
  const padTop = 20;
  const padBottom = 20;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const points: number[] = React.useMemo(() => {
    if (netWorths && netWorths.length > 0) {
      const values = netWorths.map((r) => r.netWorth);
      const min = Math.min(...values);
      const max = Math.max(...values);
      return values.map((v) => navToV(v, min, max));
    }
    return pointsProp ?? [];
  }, [netWorths, pointsProp]);

  const dataRange = React.useMemo<{ min: number; max: number }>(() => {
    if (netWorths && netWorths.length > 0) {
      const values = netWorths.map((r) => r.netWorth);
      return { min: Math.min(...values), max: Math.max(...values) };
    }
    if (points.length > 0) {
      const minV = Math.min(...points);
      const maxV = Math.max(...points);
      return { min: maxV, max: minV };
    }
    return { min: 0, max: 1 };
  }, [netWorths, points]);

  const stepX = points.length > 1 ? chartW / (points.length - 1) : chartW;

  const toY = (v: number) => padTop + (v / 140) * chartH;
  const toX = (i: number) => padLeft + i * stepX;

  const dataToY = (nav: number) => toY(navToV(nav, dataRange.min, dataRange.max));

  const linePts = points.map((p, i) => `${toX(i).toFixed(1)},${toY(p).toFixed(1)}`).join(' ');
  const areaPts = points.length > 0
    ? `${linePts} ${toX(points.length - 1).toFixed(1)},${(padTop + chartH).toFixed(1)} ${toX(0).toFixed(1)},${(padTop + chartH).toFixed(1)}`
    : '';

  const gridYs = [padTop, padTop + chartH / 4, padTop + chartH / 2, padTop + (chartH * 3) / 4, padTop + chartH];
  const xLabelXs = xLabels.map((_, i) => padLeft + (chartW / (xLabels.length - 1)) * i);

  const endX = points.length > 0 ? toX(points.length - 1) : padLeft;
  const endY = points.length > 0 ? toY(points[points.length - 1]) : padTop;

  const coords: ChartCoords = {
    width,
    height,
    padLeft,
    padRight,
    padTop,
    padBottom,
    chartW,
    chartH,
    toX,
    toY,
    dataToY,
    dataRange,
  };

  return (
    <div ref={containerRef} className="w-full">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.primary} stopOpacity={0.15} />
            <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        {gridYs.map((y, i) => (
          <line key={i} x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke={colors.borderLight} strokeWidth={1} />
        ))}
        {yLabels.map((label, i) => (
          <text key={i} x={padLeft - 5} y={gridYs[i] + 3} textAnchor="end" fill={colors.textTertiary} fontSize={9}>
            {label}
          </text>
        ))}
        {xLabels.map((label, i) => (
          <text key={i} x={xLabelXs[i]} y={height - 5} textAnchor="middle" fill={colors.textTertiary} fontSize={9}>
            {label}
          </text>
        ))}
        {areaPts && <polygon points={areaPts} fill="url(#navGrad)" />}
        {linePts && <polyline points={linePts} fill="none" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
        {points.length > 0 && (
          <>
            <circle cx={endX} cy={endY} r={5} fill={colors.primary} opacity={0.2} />
            <circle cx={endX} cy={endY} r={3} fill={colors.primary} />
          </>
        )}
        {overlay?.(coords)}
      </svg>
    </div>
  );
}
