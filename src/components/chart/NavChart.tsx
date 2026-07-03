import React, { useRef, useState, useLayoutEffect, useMemo, useCallback } from 'react';
import { colors } from '@/theme';
import type { NetWorthRecord, Transaction, HoldingSummary } from '@/types';

interface NavChartProps {
  points?: number[];
  netWorths?: NetWorthRecord[];
  transactions?: Transaction[];
  summary?: HoldingSummary;
  showHoldingCostLine?: boolean;
  showCumulativeCostLine?: boolean;
  showHoldingCostPolyline?: boolean;
  showCumulativeCostPolyline?: boolean;
  showTxDots?: boolean;
  width?: number;
  height?: number;
  yLabels?: string[];
  xLabels?: string[];
}

function navToV(nav: number, min: number, max: number): number {
  const range = max - min || 1;
  return 130 - ((nav - min) / range) * 120 + 10;
}

function formatDateLabel(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[1]}-${parts[2]}`;
}

export function NavChart({
  points: pointsProp,
  netWorths,
  transactions,
  summary,
  showHoldingCostLine = true,
  showCumulativeCostLine = true,
  showHoldingCostPolyline = false,
  showCumulativeCostPolyline = false,
  showTxDots = true,
  height = 180,
  yLabels: yLabelsProp = ['2.50', '2.45', '2.40', '2.35', '2.30'],
  xLabels: xLabelsProp,
}: NavChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(320);

  // 缩放状态: [startIndex, endIndex] 或 null 表示显示全部
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

  const padLeft = 40;
  const padRight = 10;
  const padTop = 20;
  const padBottom = 20;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // 总数据长度
  const totalLen = netWorths?.length ?? pointsProp?.length ?? 0;

  // 根据缩放范围裁剪数据
  const activeNetWorths = useMemo(() => {
    if (!netWorths || netWorths.length === 0) return netWorths;
    if (!zoomRange) return netWorths;
    const [start, end] = zoomRange;
    return netWorths.slice(start, end + 1);
  }, [netWorths, zoomRange]);

  const points: number[] = useMemo(() => {
    if (activeNetWorths && activeNetWorths.length > 0) {
      const values = activeNetWorths.map((r) => r.netWorth);
      const min = Math.min(...values);
      const max = Math.max(...values);
      return values.map((v) => navToV(v, min, max));
    }
    if (pointsProp && pointsProp.length > 0 && !zoomRange) {
      return pointsProp;
    }
    return [];
  }, [activeNetWorths, pointsProp, zoomRange]);

  const dataRange = useMemo<{ min: number; max: number }>(() => {
    if (activeNetWorths && activeNetWorths.length > 0) {
      const values = activeNetWorths.map((r) => r.netWorth);
      return { min: Math.min(...values), max: Math.max(...values) };
    }
    if (points.length > 0) {
      const minV = Math.min(...points);
      const maxV = Math.max(...points);
      return { min: maxV, max: minV };
    }
    return { min: 0, max: 1 };
  }, [activeNetWorths, points]);

  const stepX = points.length > 1 ? chartW / (points.length - 1) : chartW;

  const toY = (v: number) => padTop + (v / 140) * chartH;
  const toX = (i: number) => padLeft + i * stepX;

  const dataToY = (nav: number) => toY(navToV(nav, dataRange.min, dataRange.max));

  const linePts = points.map((p, i) => `${toX(i).toFixed(1)},${toY(p).toFixed(1)}`).join(' ');
  const areaPts = points.length > 0
    ? `${linePts} ${toX(points.length - 1).toFixed(1)},${(padTop + chartH).toFixed(1)} ${toX(0).toFixed(1)},${(padTop + chartH).toFixed(1)}`
    : '';

  // ===== 动态计算横轴标签 =====
  const activeXLabels = useMemo(() => {
    if (xLabelsProp) return xLabelsProp;
    if (!activeNetWorths || activeNetWorths.length === 0) {
      return ['06-01', '06-08', '06-15', '06-22', '06-29'];
    }
    const count = Math.min(5, activeNetWorths.length);
    const total = activeNetWorths.length;
    if (total <= 1) return [formatDateLabel(activeNetWorths[0].date)];
    const step = Math.max(1, Math.floor((total - 1) / (count - 1)));
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.min(i * step, total - 1);
      result.push(formatDateLabel(activeNetWorths[idx].date));
    }
    return result;
  }, [activeNetWorths, xLabelsProp]);

  const xLabelXs = activeXLabels.map((_, i) => padLeft + (chartW / (activeXLabels.length - 1)) * i);

  // ===== 交易标记（小圆点） =====
  const txMarkers = useMemo(() => {
    if (!showTxDots || !transactions || !activeNetWorths || activeNetWorths.length === 0) return [];
    // 使用原始的 netWorths 查索引，但只保留在可见范围内的
    const fullMap = new Map<string, { index: number; nav: number }>();
    netWorths!.forEach((r, i) => fullMap.set(r.date, { index: i, nav: r.netWorth }));
    // 构建当前可见范围的日期集合
    const activeDates = new Set(activeNetWorths.map((r) => r.date));
    return transactions
      .filter((tx) => activeDates.has(tx.date))
      .map((tx) => {
        const info = fullMap.get(tx.date)!;
        // 计算在可见范围内的相对索引
        const baseIndex = zoomRange ? zoomRange[0] : 0;
        return { tx, index: info.index - baseIndex, nav: info.nav };
      });
  }, [showTxDots, transactions, activeNetWorths, netWorths, zoomRange]);

  // ===== 成本线 =====
  const holdingCostY = useMemo(() => {
    if (!showHoldingCostLine || !summary || summary.totalBuyShares <= 0) return null;
    return summary.totalBuyCost / summary.totalBuyShares;
  }, [showHoldingCostLine, summary]);

  const cumulativeCostY = useMemo(() => {
    if (!showCumulativeCostLine || !summary || summary.holdShares <= 0) return null;
    return summary.totalInvested / summary.holdShares;
  }, [showCumulativeCostLine, summary]);

  // ===== 成本线走势（历史折线） =====
  const holdingCostPolyline = useMemo(() => {
    if (!showHoldingCostPolyline || !summary || !netWorths || netWorths.length === 0) return null;
    const sortedTxns = [...(transactions ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    let cumShares = 0;
    let totalBuyCost = 0;
    let totalBuyShares = 0;
    let txnIdx = 0;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < netWorths.length; i++) {
      while (txnIdx < sortedTxns.length && sortedTxns[txnIdx].date <= netWorths[i].date) {
        const t = sortedTxns[txnIdx];
        if (t.type === 'buy') {
          cumShares += t.shares;
          totalBuyCost += t.amount;
          totalBuyShares += t.shares;
        } else {
          cumShares -= t.shares;
        }
        txnIdx++;
      }
      if (cumShares > 0 && totalBuyShares > 0) {
        pts.push({ x: i, y: totalBuyCost / totalBuyShares });
      }
    }
    return pts.length >= 2 ? pts : null;
  }, [showHoldingCostPolyline, summary, netWorths, transactions]);

  const cumulativeCostPolyline = useMemo(() => {
    if (!showCumulativeCostPolyline || !summary || !netWorths || netWorths.length === 0) return null;
    const sortedTxns = [...(transactions ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    let cumShares = 0;
    let cumInvested = 0;
    let txnIdx = 0;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < netWorths.length; i++) {
      while (txnIdx < sortedTxns.length && sortedTxns[txnIdx].date <= netWorths[i].date) {
        const t = sortedTxns[txnIdx];
        if (t.type === 'buy') {
          cumShares += t.shares;
          cumInvested += t.amount;
        } else {
          cumShares -= t.shares;
          cumInvested -= t.amount;
        }
        txnIdx++;
      }
      if (cumShares > 0) {
        pts.push({ x: i, y: cumInvested / cumShares });
      }
    }
    return pts.length >= 2 ? pts : null;
  }, [showCumulativeCostPolyline, summary, netWorths, transactions]);

  const gridYs = [padTop, padTop + chartH / 4, padTop + chartH / 2, padTop + (chartH * 3) / 4, padTop + chartH];

  const endX = points.length > 0 ? toX(points.length - 1) : padLeft;
  const endY = points.length > 0 ? toY(points[points.length - 1]) : padTop;

  // ===== 滚轮缩放处理 =====
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.altKey || totalLen < 4) return;
    e.preventDefault();

    // 鼠标相对于 SVG 的 X 位置
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // 计算鼠标位置对应的数据索引
    const currentStart = zoomRange ? zoomRange[0] : 0;
    const currentEnd = zoomRange ? zoomRange[1] : totalLen - 1;
    const currentLen = currentEnd - currentStart + 1;
    const mouseIdx = currentStart + (mouseX / width) * currentLen;

    // 缩放因子
    const factor = e.deltaY < 0 ? 0.6 : 1.5; // 滚轮向上缩小，向下放大
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

  const handleResetZoom = useCallback(() => {
    setZoomRange(null);
  }, []);

  return (
    <div ref={containerRef} className="w-full relative">
      {isZoomed && (
        <button
          type="button"
          className="absolute top-1 right-1 z-10 px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer hover:opacity-70"
          style={{ backgroundColor: colors.bgInput, color: colors.textSecondary }}
          onClick={handleResetZoom}
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
          <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.primary} stopOpacity={0.15} />
            <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        {gridYs.map((y, i) => (
          <line key={i} x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke={colors.borderLight} strokeWidth={1} />
        ))}
        {yLabelsProp.map((label, i) => (
          <text key={i} x={padLeft - 5} y={gridYs[i] + 3} textAnchor="end" fill={colors.textTertiary} fontSize={9}>
            {label}
          </text>
        ))}
        {activeXLabels.map((label, i) => (
          <text key={i} x={xLabelXs[i]} y={height - 5} textAnchor="middle" fill={colors.textTertiary} fontSize={9}>
            {label}
          </text>
        ))}

        {/* 持仓成本线 */}
        {holdingCostY !== null && (
          <>
            <line x1={padLeft} y1={dataToY(holdingCostY)} x2={width - padRight} y2={dataToY(holdingCostY)}
              stroke={colors.profit} strokeWidth={1} strokeDasharray="4,3" />
            <text x={width - padRight} y={dataToY(holdingCostY) - 4} textAnchor="end" fill={colors.profit} fontSize={9}>
              持仓成本 {holdingCostY.toFixed(4)}
            </text>
          </>
        )}

        {/* 累计成本线 */}
        {cumulativeCostY !== null && (
          <>
            <line x1={padLeft} y1={dataToY(cumulativeCostY)} x2={width - padRight} y2={dataToY(cumulativeCostY)}
              stroke={colors.secondary} strokeWidth={1} strokeDasharray="4,3" />
            <text x={width - padRight} y={dataToY(cumulativeCostY) + 12} textAnchor="end" fill={colors.secondary} fontSize={9}>
              累计成本 {cumulativeCostY.toFixed(4)}
            </text>
          </>
        )}

        {/* 持仓成本线走势 */}
        {holdingCostPolyline && (
          <polyline points={holdingCostPolyline.filter(p => !zoomRange || (p.x >= zoomRange[0] && p.x <= zoomRange[1])).map((p) => `${toX(p.x - (zoomRange ? zoomRange[0] : 0)).toFixed(1)},${dataToY(p.y).toFixed(1)}`).join(' ')}
            fill="none" stroke={colors.profit} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5,3" opacity={0.8} />
        )}

        {/* 累计成本线走势 */}
        {cumulativeCostPolyline && (
          <polyline points={cumulativeCostPolyline.filter(p => !zoomRange || (p.x >= zoomRange[0] && p.x <= zoomRange[1])).map((p) => `${toX(p.x - (zoomRange ? zoomRange[0] : 0)).toFixed(1)},${dataToY(p.y).toFixed(1)}`).join(' ')}
            fill="none" stroke={colors.secondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5,3" opacity={0.8} />
        )}

        {areaPts && <polygon points={areaPts} fill="url(#navGrad)" />}
        {linePts && <polyline points={linePts} fill="none" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}

        {/* 交易标记小圆点 */}
        {txMarkers.map(({ tx, index, nav }) => {
          const cx = toX(index);
          const cy = dataToY(nav);
          const isBuy = tx.type === 'buy';
          const dotColor = isBuy ? colors.profit : colors.loss;
          return (
            <g key={tx.id}>
              <circle cx={cx} cy={cy} r={5} fill={dotColor} opacity={0.25} />
              <circle cx={cx} cy={cy} r={3} fill={dotColor} stroke="#fff" strokeWidth={1.5} />
            </g>
          );
        })}

        {points.length > 0 && (
          <>
            <circle cx={endX} cy={endY} r={5} fill={colors.primary} opacity={0.2} />
            <circle cx={endX} cy={endY} r={3} fill={colors.primary} />
          </>
        )}
      </svg>
    </div>
  );
}
