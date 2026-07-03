import React, { useRef, useState, useLayoutEffect, useMemo, useCallback } from 'react';
import { colors } from '@/theme';

interface ProfitChartProps {
  points: number[];
  width?: number;
  height?: number;
  endLabel?: string;
  dataRange?: { min: number; max: number };
  yLabels?: string[];
  xLabels?: string[];
}

export function ProfitChart({
  points: allPoints,
  height: heightProp = 180,
  endLabel = '+3,560',
  dataRange: dataRangeProp,
  yLabels: yLabelsProp,
  xLabels: xLabelsProp = [],
}: ProfitChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(310);

  // 缩放状态
  const [zoomRange, setZoomRange] = useState<[number, number] | null>(null);

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
  const totalLen = allPoints.length;

  // 裁剪数据
  const points = useMemo(() => {
    if (!zoomRange || totalLen === 0) return allPoints;
    return allPoints.slice(zoomRange[0], zoomRange[1] + 1);
  }, [allPoints, zoomRange, totalLen]);

  // 裁剪 xLabels
  const xLabels = useMemo(() => {
    if (!zoomRange || xLabelsProp.length === 0) return xLabelsProp;
    const [start, end] = zoomRange;
    const visible = xLabelsProp.slice(start, end + 1);
    if (visible.length <= 5) return visible;
    const count = 5;
    const step = Math.max(1, Math.floor((visible.length - 1) / (count - 1)));
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(visible[Math.min(i * step, visible.length - 1)]);
    }
    return result;
  }, [zoomRange, xLabelsProp]);

  const padLeft = 40;
  const padRight = 10;
  const padTop = 20;
  const padBottom = 20;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const stepX = points.length > 1 ? chartW / (points.length - 1) : chartW;
  const midY = padTop + chartH / 2;

  const toY = (v: number) => padTop + (v / 140) * chartH;
  const toX = (i: number) => padLeft + i * stepX;

  const dataRange = useMemo<{ min: number; max: number }>(() => {
    if (dataRangeProp && !zoomRange) return dataRangeProp;
    if (points.length === 0) return { min: 0, max: 0 };
    const minV = Math.min(...points);
    const maxV = Math.max(...points);
    return { min: maxV, max: minV };
  }, [dataRangeProp, points, zoomRange]);

  const pointsVRange = useMemo<{ minV: number; maxV: number }>(() => {
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
  const xLabelXs = xLabels.map((_, i) => padLeft + (chartW / (xLabels.length - 1)) * i);

  const endX = toX(points.length - 1);
  const endY = toY(points[points.length - 1]);

  // ===== 滚轮缩放 =====
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.altKey || totalLen < 4) return;
    e.preventDefault();

    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    const currentStart = zoomRange ? zoomRange[0] : 0;
    const currentEnd = zoomRange ? zoomRange[1] : totalLen - 1;
    const currentLen = currentEnd - currentStart + 1;
    const mouseIdx = currentStart + (mouseX / width) * currentLen;

    const factor = e.deltaY < 0 ? 0.6 : 1.5;
    const newLen = Math.max(4, Math.min(totalLen - 1, Math.round(currentLen * factor)));

    let newStart = Math.round(mouseIdx - (mouseIdx - currentStart) * (newLen / currentLen));
    if (newStart < 0) newStart = 0;
    let newEnd = newStart + newLen - 1;
    if (newEnd >= totalLen) {
      newEnd = totalLen - 1;
      newStart = Math.max(0, newEnd - newLen + 1);
    }

    if (newStart === currentStart && newEnd === currentEnd) return;

    if (newStart <= 0 && newEnd >= totalLen - 1) {
      setZoomRange(null);
    } else {
      setZoomRange([newStart, newEnd]);
    }
  }, [totalLen, zoomRange, width]);

  const isZoomed = zoomRange !== null;

  return (
    <div ref={containerRef} className="w-full relative">
      {isZoomed && (
        <button
          type="button"
          className="absolute top-1 right-1 z-10 px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer hover:opacity-70"
          style={{ backgroundColor: colors.bgInput, color: colors.textSecondary }}
          onClick={() => setZoomRange(null)}
        >
          重置
        </button>
      )}
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        onWheel={handleWheel}
        style={{ cursor: isZoomed ? 'zoom-in' : 'default' }}
      >
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
      </svg>
    </div>
  );
}
