import React, { useRef, useState, useLayoutEffect } from 'react';
import { colors } from '@/theme';
import type { ChartCoords } from '@/types';

interface ProfitChartProps {
  points: number[];
  width?: number;
  height?: number;
  endLabel?: string;
  dataRange?: { min: number; max: number };
  yLabels?: string[];
  xLabels?: string[];
  overlay?: (coords: ChartCoords) => React.ReactNode;
}

export function ProfitChart({
  points,
  height: heightProp = 180,
  endLabel = '+3,560',
  dataRange: dataRangeProp,
  yLabels: yLabelsProp,
  xLabels: xLabelsProp,
  overlay,
}: ProfitChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(310);

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
  const height = heightProp;

  const padLeft = 40;
  const padRight = 10;
  const padTop = 20;
  const padBottom = 20;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const stepX = chartW / (points.length - 1);
  const midY = padTop + chartH / 2;

  const toY = (v: number) => padTop + (v / 140) * chartH;
  const toX = (i: number) => padLeft + i * stepX;

  const dataRange = React.useMemo<{ min: number; max: number }>(() => {
    if (dataRangeProp) return dataRangeProp;
    if (points.length === 0) return { min: 0, max: 0 };
    const minV = Math.min(...points);
    const maxV = Math.max(...points);
    return { min: maxV, max: minV };
  }, [dataRangeProp, points]);

  const pointsVRange = React.useMemo<{ minV: number; maxV: number }>(() => {
    if (points.length === 0) return { minV: 0, maxV: 140 };
    return { minV: Math.min(...points), maxV: Math.max(...points) };
  }, [points]);

  const dataToY = (profit: number) => {
    const range = dataRange.max - dataRange.min || 1;
    const ratio = (dataRange.max - profit) / range;
    const v = pointsVRange.minV + (pointsVRange.maxV - pointsVRange.minV) * ratio;
    return toY(v);
  };

  const linePts = points.map((p, i) => `${toX(i).toFixed(1)},${toY(p).toFixed(1)}`).join(' ');
  const areaPts = `${linePts} ${toX(points.length - 1).toFixed(1)},${midY.toFixed(1)} ${toX(0).toFixed(1)},${midY.toFixed(1)}`;

  const gridYs = [padTop, padTop + chartH / 4, midY, padTop + (chartH * 3) / 4, padTop + chartH];
  const yLabels = yLabelsProp ?? ['+4k', '+2k', '0', '-1k', '-2k'];
  const xLabels = xLabelsProp ?? ['06-01', '06-08', '06-15', '06-22', '06-29'];
  const xLabelXs = xLabels.map((_, i) => padLeft + (chartW / (xLabels.length - 1)) * i);

  const endX = toX(points.length - 1);
  const endY = toY(points[points.length - 1]);

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
          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.primary} stopOpacity={0.12} />
            <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        {gridYs.map((y, i) => (
          <line key={i} x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke={colors.borderLight} strokeWidth={1} />
        ))}
        <line x1={padLeft} y1={midY} x2={width - padRight} y2={midY} stroke={colors.borderLight} strokeWidth={1} strokeDasharray="4,3" />
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
        <polygon points={areaPts} fill="url(#profitGrad)" />
        <polyline points={linePts} fill="none" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <rect x={endX - 42} y={endY - 18} width={40} height={16} rx={3} fill={colors.primary} />
        <text x={endX - 22} y={endY - 7} textAnchor="middle" fill="white" fontSize={8} fontWeight="600">
          {endLabel}
        </text>
        <circle cx={endX} cy={endY} r={5} fill={colors.primary} opacity={0.2} />
        <circle cx={endX} cy={endY} r={3} fill={colors.primary} />
        {overlay?.(coords)}
      </svg>
    </div>
  );
}
