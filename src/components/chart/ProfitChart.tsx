import { colors } from '@/theme';
import { ReactEChartsCore, echarts } from '@/utils/echartUtils';
import { useCallback, useEffect, useMemo, useRef } from 'react';

interface ProfitChartProps {
  profits: number[];
  height?: number;
  endLabel?: string;
  xLabels?: string[];
  holdingProfits?: number[];
  dataZoomStart?: number;
  dataZoomEnd?: number;
  onZoomChange?: (start: number, end: number) => void;
}

export function ProfitChart({
  profits: allProfits,
  height = 180,
  endLabel = '+3,560',
  xLabels: xLabelsProp = [],
  holdingProfits: holdingProfitsProp,
  dataZoomStart = 0,
  dataZoomEnd = 100,
  onZoomChange,
}: ProfitChartProps) {
  const chartRef = useRef<any>(null);
  const zoomed = dataZoomStart > 0 || dataZoomEnd < 100;

  const xLabels = useMemo(() => {
    if (xLabelsProp.length > 0) return xLabelsProp;
    return [];
  }, [xLabelsProp]);

  const option = useMemo(() => {
    if (allProfits.length === 0) return null;

    const dates = xLabels.length > 0 ? xLabels : allProfits.map((_, i) => `${i}`);

    const profitData = allProfits.map((v, i) => ({
      value: v,
      _date: dates[i] || '',
    }));

    const series: any[] = [
      {
        type: 'line',
        name: '累计收益',
        data: profitData,
        smooth: false,
        showSymbol: false,
        lineStyle: { color: colors.primary, width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(197, 61, 67, 0.12)' },
            { offset: 1, color: 'rgba(197, 61, 67, 0)' },
          ]),
        },
        markPoint: {
          symbol: 'roundRect',
          symbolSize: [50, 18],
          symbolOffset: [0, -14],
          data: [{
            coord: [dates.length - 1, allProfits[allProfits.length - 1]],
            itemStyle: { color: colors.primary },
            label: {
              formatter: endLabel,
              color: '#fff',
              fontSize: 9,
              fontWeight: 600,
              position: 'inside',
            },
          }],
          z: 10,
        },
        z: 2,
      },
    ];

      
    if (holdingProfitsProp && holdingProfitsProp.length > 0) {
      series.push({
        type: 'line',
        name: '持仓收益',
        data: holdingProfitsProp.map(v => ({ value: v })),
        smooth: false,
        showSymbol: false,
        lineStyle: { color: colors.secondary, width: 2, type: 'dashed' as const, opacity: 0.7 },
        z: 1,
      });
    }

    return {
      grid: { left: 40, right: 16, top: 16, bottom: 24 },
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
          formatter: (v: number) => {
            if (v === 0) return '0';
            const abs = Math.abs(v);
            if (abs >= 10000) return `${(v / 10000).toFixed(1)}万`;
            if (abs >= 1000) return `${(v / 1000).toFixed(1)}k`;
            return v.toFixed(0);
          },
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
          const main = params[0]?.data;
          const holding = params[1]?.data;
          if (!main || main._date === undefined) return '';
          const profit = main.value;
          const profitColor = profit >= 0 ? colors.profit : colors.loss;
          const profitSign = profit >= 0 ? '+' : '';
          let holdingHtml = '';
          if (holding && holding.value !== undefined) {
            const hProfit = holding.value;
            const hColor = hProfit >= 0 ? colors.profit : colors.loss;
            const hSign = hProfit >= 0 ? '+' : '';
            holdingHtml = `<div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:${colors.textTertiary}">持仓收益</span><span style="color:${hColor};font-family:'Geist Mono',monospace">${hSign}¥${hProfit.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`;
          }
          return `<div style="font-weight:600;margin-bottom:4px;font-family:'Geist Mono',monospace;color:${colors.textPrimary}">${main._date}</div>
<div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:${colors.textTertiary}">累计收益</span><span style="color:${profitColor};font-family:'Geist Mono',monospace">${profitSign}¥${profit.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>${holdingHtml}`;
        },
        extraCssText: 'border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);padding:8px 12px;',
      },
    };
  }, [allProfits, holdingProfitsProp, xLabels, endLabel, dataZoomStart, dataZoomEnd]);

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