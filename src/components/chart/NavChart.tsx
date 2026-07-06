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
  estimatedNav?: number;
  estimatedTime?: string;
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
  estimatedNav,
  estimatedTime,
}: NavChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(320);

  // 缩放状态: [startIndex, endIndex] 或 null 表示显示全部
  const [zoomRange, setZoomRange] = useState<[number, number] | null>(null);

  // 拖动平移状态
  const isPanningRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartZoomRef = useRef<[number, number] | null>(null);

  // 悬停状态
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // ===== 每日收益数据（用于悬停浮窗） =====
  const dailyProfitData = useMemo(() => {
    if (!netWorths || netWorths.length === 0) return null;
    const sortedTxns = [...(transactions ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    let cumShares = 0;
    let cumInvested = 0;
    let totalBuyCost = 0;
    let totalBuyShares = 0;
    let txnIdx = 0;
    const result: { date: string; nav: number; change: number; cumProfit: number; holdProfit: number }[] = [];
    for (const rec of netWorths) {
      while (txnIdx < sortedTxns.length && sortedTxns[txnIdx].date <= rec.date) {
        const t = sortedTxns[txnIdx];
        if (t.type === 'buy') {
          cumShares += t.shares;
          cumInvested += t.amount;
          totalBuyCost += t.amount;
          totalBuyShares += t.shares;
        } else {
          cumShares -= t.shares;
          cumInvested -= t.amount;
        }
        txnIdx++;
      }
      const avgCost = totalBuyShares > 0 ? totalBuyCost / totalBuyShares : 0;
      result.push({
        date: rec.date,
        nav: rec.netWorth,
        change: rec.netWorthChange / 100,
        cumProfit: cumShares * rec.netWorth - cumInvested,
        holdProfit: cumShares * rec.netWorth - cumShares * avgCost,
      });
    }
    return result;
  }, [netWorths, transactions]);

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

  // ===== 拖动平移处理 =====
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isZoomedRef()) return;
    isPanningRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartZoomRef.current = [...zoomRange!] as [number, number];
  }, [zoomRange]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    if (isPanningRef.current) {
      const dx = e.clientX - dragStartXRef.current;
      const currentLen = (zoomRange ? zoomRange[1] - zoomRange[0] : totalLen - 1) + 1;
      const pixelsPerIndex = chartW / currentLen;
      const indexOffset = Math.round(-dx / pixelsPerIndex);
      if (indexOffset === 0) return;
      const start = dragStartZoomRef.current![0] + indexOffset;
      const end = dragStartZoomRef.current![1] + indexOffset;
      let clampedStart = start;
      let clampedEnd = end;
      if (start < 0) {
        clampedStart = 0;
        clampedEnd = currentLen - 1;
      } else if (end >= totalLen) {
        clampedStart = totalLen - currentLen;
        clampedEnd = totalLen - 1;
      }
      setZoomRange([clampedStart, clampedEnd]);
      dragStartXRef.current = e.clientX;
      dragStartZoomRef.current = [clampedStart, clampedEnd];
      return;
    }

    // 悬停检测
    if (activeNetWorths && activeNetWorths.length > 0) {
      const chartMouseX = mouseX - padLeft;
      const pixelsPerPoint = chartW / activeNetWorths.length;
      const idx = Math.round(chartMouseX / pixelsPerPoint);
      const clamped = Math.max(0, Math.min(activeNetWorths.length - 1, idx));
      setHoveredIndex(clamped);
      setMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [zoomRange, totalLen, chartW, activeNetWorths, padLeft]);

  const handleMouseLeaveSvg = useCallback(() => {
    isPanningRef.current = false;
    setHoveredIndex(null);
    setMousePos(null);
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const isZoomedRef = useCallback(() => zoomRange !== null, [zoomRange]);

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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeaveSvg}
        style={{ cursor: isZoomed ? (isPanningRef.current ? 'grabbing' : 'grab') : 'default' }}
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

        {/* 估算净值虚线 */}
        {estimatedNav !== undefined && estimatedNav > 0 && dataRange.max > dataRange.min && (
          <>
            <line
              x1={padLeft} y1={dataToY(estimatedNav)}
              x2={width - padRight} y2={dataToY(estimatedNav)}
              stroke={colors.warning} strokeWidth={1} strokeDasharray="2,3"
            />
            <circle
              cx={width - padRight} cy={dataToY(estimatedNav)} r={3}
              fill={colors.warning} stroke="#fff" strokeWidth={1}
            />
            <text x={padLeft + 4} y={dataToY(estimatedNav) - 4} fill={colors.warning} fontSize={9} fontFamily="monospace">
              估算 {estimatedNav.toFixed(4)}{estimatedTime ? ` (${estimatedTime.slice(5, 16)})` : ''}
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

        {/* 悬停十字线 */}
        {hoveredIndex !== null && activeNetWorths && activeNetWorths[hoveredIndex] && (
          <line
            x1={toX(hoveredIndex)}
            y1={padTop}
            x2={toX(hoveredIndex)}
            y2={padTop + chartH}
            stroke={colors.textTertiary}
            strokeWidth={1}
            strokeDasharray="3,2"
          />
        )}
      </svg>

      {/* 悬停信息浮窗 */}
      {hoveredIndex !== null && mousePos && activeNetWorths && activeNetWorths[hoveredIndex] && dailyProfitData && (() => {
        const baseIdx = zoomRange ? zoomRange[0] : 0;
        const dataIdx = baseIdx + hoveredIndex;
        const info = dailyProfitData[dataIdx];
        if (!info) return null;

        const profitColor = info.cumProfit >= 0 ? colors.profit : colors.loss;
        const holdColor = info.holdProfit >= 0 ? colors.profit : colors.loss;
        const changeColor = info.change >= 0 ? colors.profit : colors.loss;

        const tooltipW = 190;
        const tooltipH = 130;
        let left = mousePos.x + 16;
        let top = mousePos.y - 16 - tooltipH;
        if (left + tooltipW > window.innerWidth - 10) left = mousePos.x - 16 - tooltipW;
        if (top < 10) top = mousePos.y + 16;

        return (
          <div
            className="fixed z-50 rounded-xl border shadow-sm px-3 py-2 text-[11px] leading-relaxed pointer-events-none"
            style={{ left, top, backgroundColor: colors.bgCard, borderColor: colors.borderLight, minWidth: tooltipW }}
          >
            <div className="font-semibold mb-1" style={{ color: colors.textPrimary, fontFamily: 'Geist Mono, monospace' }}>
              {info.date}
            </div>
            <div className="flex justify-between gap-4">
              <span style={{ color: colors.textTertiary }}>净值</span>
              <span style={{ color: colors.textPrimary, fontFamily: 'Geist Mono, monospace' }}>{info.nav.toFixed(4)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span style={{ color: colors.textTertiary }}>涨跌</span>
              <span style={{ color: changeColor, fontFamily: 'Geist Mono, monospace' }}>{(info.change * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span style={{ color: colors.textTertiary }}>累计收益</span>
              <span style={{ color: profitColor, fontFamily: 'Geist Mono, monospace' }}>
                {info.cumProfit >= 0 ? '+' : ''}¥{info.cumProfit.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span style={{ color: colors.textTertiary }}>持有收益</span>
              <span style={{ color: holdColor, fontFamily: 'Geist Mono, monospace' }}>
                {info.holdProfit >= 0 ? '+' : ''}¥{info.holdProfit.toFixed(2)}
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
