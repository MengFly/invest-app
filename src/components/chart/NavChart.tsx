import { colors } from '@/theme';
import type { HoldingSummary, NetWorthRecord, Transaction } from '@/types';
import { ReactEChartsCore, echarts } from '@/utils/echartUtils';
import { useCallback, useEffect, useMemo, useRef } from 'react';

interface NavChartProps {
  netWorths?: NetWorthRecord[];
  transactions?: Transaction[];
  summary?: HoldingSummary;
  showHoldingCostLine?: boolean;
  showCumulativeCostLine?: boolean;
  showHoldingCostPolyline?: boolean;
  showCumulativeCostPolyline?: boolean;
  showTxDots?: boolean;
  height?: number;
  estimatedNav?: number;
  estimatedTime?: string;
  dataZoomStart?: number;
  dataZoomEnd?: number;
  onZoomChange?: (start: number, end: number) => void;
}

function calcDailyProfitData(netWorths: NetWorthRecord[], transactions: Transaction[]) {
  const sortedTxns = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
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
}

export function NavChart({
  netWorths,
  transactions = [],
  summary,
  showHoldingCostLine = true,
  showCumulativeCostLine = true,
  showHoldingCostPolyline = false,
  showCumulativeCostPolyline = false,
  showTxDots = true,
  height = 180,
  estimatedNav,
  estimatedTime,
  dataZoomStart = 0,
  dataZoomEnd = 100,
  onZoomChange,
}: NavChartProps) {
  const chartRef = useRef<any>(null);
  const zoomed = dataZoomStart > 0 || dataZoomEnd < 100;

  const dailyProfitData = useMemo(() => {
    if (!netWorths || netWorths.length === 0) return null;
    return calcDailyProfitData(netWorths, transactions);
  }, [netWorths, transactions]);

  const holdingCostY = useMemo(() => {
    if (!showHoldingCostLine || !summary || summary.totalBuyShares <= 0) return null;
    return summary.totalBuyCost / summary.totalBuyShares;
  }, [showHoldingCostLine, summary]);

  const cumulativeCostY = useMemo(() => {
    if (!showCumulativeCostLine || !summary || summary.holdShares <= 0) return null;
    return summary.totalInvested / summary.holdShares;
  }, [showCumulativeCostLine, summary]);

  const holdingCostPolyline = useMemo(() => {
    if (!showHoldingCostPolyline || !summary || !netWorths || netWorths.length === 0) return null;
    const sortedTxns = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    let cumShares = 0;
    let totalBuyCost = 0;
    let totalBuyShares = 0;
    let txnIdx = 0;
    const pts: (number | null)[] = [];
    for (const rec of netWorths) {
      while (txnIdx < sortedTxns.length && sortedTxns[txnIdx].date <= rec.date) {
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
        pts.push(totalBuyCost / totalBuyShares);
      } else {
        pts.push(null);
      }
    }
    return pts.length >= 2 ? pts : null;
  }, [showHoldingCostPolyline, summary, netWorths, transactions]);

  const cumulativeCostPolyline = useMemo(() => {
    if (!showCumulativeCostPolyline || !summary || !netWorths || netWorths.length === 0) return null;
    const sortedTxns = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    let cumShares = 0;
    let cumInvested = 0;
    let txnIdx = 0;
    const pts: (number | null)[] = [];
    for (const rec of netWorths) {
      while (txnIdx < sortedTxns.length && sortedTxns[txnIdx].date <= rec.date) {
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
        pts.push(cumInvested / cumShares);
      } else {
        pts.push(null);
      }
    }
    return pts.length >= 2 ? pts : null;
  }, [showCumulativeCostPolyline, summary, netWorths, transactions]);

  const txMarkers = useMemo(() => {
    if (!showTxDots || !transactions || !netWorths || netWorths.length === 0) return [];
    const dateMap = new Map(netWorths.map((r, i) => [r.date, i]));
    return transactions
      .filter(tx => dateMap.has(tx.date))
      .map(tx => ({
        index: dateMap.get(tx.date)!,
        nav: netWorths[dateMap.get(tx.date)!].netWorth,
        type: tx.type,
      }));
  }, [showTxDots, transactions, netWorths]);

  const option = useMemo(() => {
    if (!netWorths || netWorths.length === 0) return null;

    const dates = netWorths.map(r => r.date);

    // 构建嵌入额外数据的净值数据
    const navData = netWorths.map((r, i) => ({
      value: r.netWorth,
      _date: r.date,
      _change: r.netWorthChange / 100,
      _cumProfit: dailyProfitData?.[i]?.cumProfit ?? 0,
      _holdProfit: dailyProfitData?.[i]?.holdProfit ?? 0,
    }));

    // markLine 数据
    const markLineData: any[] = [];

    if (holdingCostY !== null) {
      markLineData.push({
        yAxis: holdingCostY,
        lineStyle: { color: colors.profit, type: 'dashed' as const, width: 1 },
        label: {
          formatter: `持仓成本 ${holdingCostY.toFixed(4)}`,
          position: 'insideEndBottom' as const,
          fontSize: 9,
          color: colors.profit,
          padding: [10, 0, 0, 0],
        },
      });
    }

    if (cumulativeCostY !== null) {
      markLineData.push({
        yAxis: cumulativeCostY,
        lineStyle: { color: colors.secondary, type: 'dashed' as const, width: 1 },
        label: {
          formatter: `累计成本 ${cumulativeCostY.toFixed(4)}`,
          position: 'insideEndBottom' as const,
          fontSize: 9,
          color: colors.secondary,
          padding: [10, 0, 0, 0],
        },
      });
    }

    if (estimatedNav !== undefined && estimatedNav !== null) {
      markLineData.push({
        yAxis: estimatedNav,
        lineStyle: { color: colors.textTertiary, type: 'dashed' as const, width: 1 },
        endSymbol: { symbolType: 'circle', symbolSize: 6, color: colors.textTertiary, opacity: 0.6 },
        label: {
          formatter: `估算 ${estimatedNav.toFixed(4)}${estimatedTime ? ` (${estimatedTime.slice(5, 16)})` : ''}`,
          position: 'insideEndBottom' as const,
          fontSize: 9,
          color: colors.textTertiary,
          padding: [0, 0, 8, 0],
        },
      });
    }

    // 系列
    const series: any[] = [
      {
        type: 'line',
        name: '净值',
        data: navData,
        smooth: false,
        showSymbol: false,
        lineStyle: { color: colors.primary, width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(197, 61, 67, 0.15)' },
            { offset: 1, color: 'rgba(197, 61, 67, 0)' },
          ]),
        },
        markLine: markLineData.length > 0 ? {
          silent: true,
          symbol: 'none',
          data: markLineData,
        } : undefined,
        z: 2,
      },
    ];

    // 持仓成本线走势
    if (holdingCostPolyline) {
      series.push({
        type: 'line',
        name: '持仓成本走势',
        data: holdingCostPolyline,
        connectNulls: false,
        smooth: false,
        showSymbol: false,
        lineStyle: { color: colors.profit, width: 2, type: 'dashed' as const, opacity: 0.8 },
        z: 1,
      });
    }

    // 累计成本线走势
    if (cumulativeCostPolyline) {
      series.push({
        type: 'line',
        name: '累计成本走势',
        data: cumulativeCostPolyline,
        connectNulls: false,
        smooth: false,
        showSymbol: false,
        lineStyle: { color: colors.secondary, width: 2, type: 'dashed' as const, opacity: 0.8 },
        z: 1,
      });
    }

    // 交易标记点（买入/卖出成对渲染：背景圈 + 实心圈）
    const buyData = txMarkers.filter(tx => tx.type === 'buy');
    const sellData = txMarkers.filter(tx => tx.type === 'sell');

    const makeScatterData = (items: typeof buyData, color: string) =>
      items.map(tx => ({
        value: [dates[tx.index], tx.nav],
        itemStyle: { color },
      }));

    const makeBgScatterData = (items: typeof buyData, color: string) =>
      items.map(tx => ({
        value: [dates[tx.index], tx.nav],
        itemStyle: { color, opacity: 0.15 },
      }));

    if (buyData.length > 0) {
      series.push({
        type: 'scatter',
        name: '买入',
        data: makeScatterData(buyData, colors.profit),
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { borderColor: '#fff', borderWidth: 1.5, opacity: 0.9 },
        z: 5,
      });
      series.push({
        type: 'scatter',
        name: '',
        data: makeBgScatterData(buyData, colors.profit),
        symbol: 'circle',
        symbolSize: 14,
        itemStyle: { opacity: 0.15 },
        silent: true,
        z: 4,
      });
    }
    if (sellData.length > 0) {
      series.push({
        type: 'scatter',
        name: '卖出',
        data: makeScatterData(sellData, colors.loss),
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { borderColor: '#fff', borderWidth: 1.5, opacity: 0.9 },
        z: 5,
      });
      series.push({
        type: 'scatter',
        name: '',
        data: makeBgScatterData(sellData, colors.loss),
        symbol: 'circle',
        symbolSize: 14,
        itemStyle: { opacity: 0.15 },
        silent: true,
        z: 4,
      });
    }

    return {
      grid: { left: 12, right: 12, top: 12, bottom: 24 },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { fontSize: 9, color: colors.textTertiary },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        splitLine: { lineStyle: { color: colors.borderLight, width: 1 } },
        axisLabel: {
          fontSize: 9,
          color: colors.textTertiary,
          formatter: (v: number) => v.toFixed(4),
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series,
      dataZoom: [{ type: 'inside', start: dataZoomStart, end: dataZoomEnd, minSpan: 5 }],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: colors.bgCard,
        borderColor: colors.borderLight,
        borderWidth: 1,
        textStyle: { fontSize: 11, color: colors.textPrimary },
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          const data = params[0].data;
          if (!data || data._date === undefined) return '';
          const change = data._change;
          const cumProfit = data._cumProfit;
          const holdProfit = data._holdProfit;
          const changeColor = change >= 0 ? colors.profit : colors.loss;
          const profitColor = cumProfit >= 0 ? colors.profit : colors.loss;
          const holdColor = holdProfit >= 0 ? colors.profit : colors.loss;
          const changeSign = change >= 0 ? '+' : '';
          const profitSign = cumProfit >= 0 ? '+' : '';
          const holdSign = holdProfit >= 0 ? '+' : '';
          return `<div style="font-weight:600;margin-bottom:4px;font-family:'Geist Mono',monospace;color:${colors.textPrimary}">${data._date}</div>
<div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:${colors.textTertiary}">净值</span><span style="color:${colors.textPrimary};font-family:'Geist Mono',monospace">${data.value.toFixed(4)}</span></div>
<div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:${colors.textTertiary}">涨跌</span><span style="color:${changeColor};font-family:'Geist Mono',monospace">${changeSign}${(change * 100).toFixed(2)}%</span></div>
<div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:${colors.textTertiary}">累计收益</span><span style="color:${profitColor};font-family:'Geist Mono',monospace">${profitSign}¥${cumProfit.toFixed(2)}</span></div>
<div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:${colors.textTertiary}">持有收益</span><span style="color:${holdColor};font-family:'Geist Mono',monospace">${holdSign}¥${holdProfit.toFixed(2)}</span></div>`;
        },
        extraCssText: 'border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);padding:8px 12px;',
      },
    };
  }, [netWorths, dailyProfitData, holdingCostY, cumulativeCostY, holdingCostPolyline, cumulativeCostPolyline, txMarkers, estimatedNav, estimatedTime, dataZoomStart, dataZoomEnd]);

  const handleChartReady = useCallback((instance: any) => {
    chartRef.current = instance;
    instance.on('dataZoom', (params: any) => {
      onZoomChange?.(params.start, params.end);
    });
  }, [onZoomChange]);

  const handleResetZoom = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.dispatchAction({ type: 'dataZoom', start: 0, end: 100 });
      onZoomChange?.(0, 100);
    }
  }, [onZoomChange]);

  // 外部 zoom 变化时同步到图表
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.dispatchAction({ type: 'dataZoom', start: dataZoomStart, end: dataZoomEnd });
    }
  }, [dataZoomStart, dataZoomEnd]);

  if (!option) return null;

  return (
    <div className="w-full relative">
      {zoomed && (
        <button
          type="button"
          className="absolute top-1 right-1 z-10 px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer hover:opacity-70"
          style={{ backgroundColor: colors.bgInput, color: colors.textSecondary }}
          onClick={handleResetZoom}
        >
          重置
        </button>
      )}
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        style={{ height, width: '100%' }}
        onChartReady={handleChartReady}
        notMerge
      />
    </div>
  );
}