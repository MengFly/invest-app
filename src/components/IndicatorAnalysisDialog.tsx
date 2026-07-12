import  { useState, useMemo, useCallback, useEffect } from 'react';
import ReactEChartsCore from 'echarts-for-react/esm/core';
import * as echarts from 'echarts/core';
import { LineChart, ScatterChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { colors } from '@/theme';
import { getAllIndicators, getIndicator, TREND_CHANNEL_ID } from '@/utils/indicatorRegistry';
import type { ConfigField } from '@/utils/indicatorRegistry';
import type { NetWorthRecord, Transaction } from '@/types';

echarts.use([LineChart, ScatterChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, CanvasRenderer]);

interface IndicatorAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  netWorths: NetWorthRecord[];
  transactions?: Transaction[];
  code: string | null;
}

function loadIndicatorConfig(code: string, indicatorId: string): Record<string, any> | null {
  try {
    const raw = localStorage.getItem(`indicator-config:${code}:${indicatorId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function ConfigControl({
  field,
  value,
  onChange,
}: {
  field: ConfigField;
  value: string | number;
  onChange: (key: string, value: string | number) => void;
}) {
  if (field.type === 'select') {
    return (
      <div className="flex items-center justify-between gap-3">
        <label className="text-[11px] font-medium shrink-0" style={{ color: colors.textSecondary }}>
          {field.label}
        </label>
        <select
          className="px-2 py-1.5 rounded-lg text-[11px] border cursor-pointer"
          style={{ backgroundColor: colors.bgInput, borderColor: colors.borderLight, color: colors.textPrimary, fontFamily: 'Geist Mono, monospace' }}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
        >
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'number') {
    const hint = field.key === 'stdDays' && Number(value) === 0 ? '（全部数据）' : '';
    const hasPresets = field.options && field.options.length > 0;
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium" style={{ color: colors.textSecondary }}>
          {field.label}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="w-16 px-2 py-1.5 rounded-lg text-[11px] border text-right"
            style={{ backgroundColor: colors.bgInput, borderColor: colors.borderLight, color: colors.textPrimary, fontFamily: 'Geist Mono, monospace' }}
            value={value}
            min={field.min ?? 0}
            max={field.max}
            onChange={(e) => onChange(field.key, Number(e.target.value))}
          />
          {hint && <span className="text-[10px]" style={{ color: colors.textTertiary }}>{hint}</span>}
        </div>
        {hasPresets && (
          <div className="flex gap-1.5 mt-0.5">
            {field.options!.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-all duration-150"
                style={{
                  backgroundColor: Number(value) === opt.value ? colors.primary : colors.bgInput,
                  color: Number(value) === opt.value ? '#fff' : colors.textSecondary,
                }}
                onClick={() => onChange(field.key, opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

export function IndicatorAnalysisDialog({
  open,
  onOpenChange,
  netWorths,
  transactions,
  code,
}: IndicatorAnalysisDialogProps) {
  const indicators = useMemo(() => getAllIndicators(), []);

  const [selectedId, setSelectedId] = useState(TREND_CHANNEL_ID);
  const indicator = useMemo(() => getIndicator(selectedId) || indicators[0], [selectedId, indicators]);

  // 配置值：从 localStorage 初始化
  const [configValues, setConfigValues] = useState<Record<string, any>>(() => {
    if (code) {
      const saved = loadIndicatorConfig(code, selectedId);
      if (saved) return saved;
    }
    return { ...indicator?.defaultConfig };
  });

  const handleIndicatorChange = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  // 配置变更时自动持久化
  const handleConfigChange = useCallback((key: string, value: string | number) => {
    setConfigValues((prev) => {
      const next = { ...prev, [key]: value };
      if (code) {
        try { localStorage.setItem(`indicator-config:${code}:${selectedId}`, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  }, [code, selectedId]);

  // 基金或指标切换时，从 localStorage 恢复配置
  useEffect(() => {
    if (!code) return;
    const saved = loadIndicatorConfig(code, selectedId);
    if (saved) {
      setConfigValues(saved);
    } else {
      const ind = getIndicator(selectedId);
      setConfigValues({ ...ind?.defaultConfig });
    }
  }, [code, selectedId]);

  // 计算指标
  const result = useMemo(() => {
    if (!indicator || netWorths.length === 0) return null;
    try {
      return indicator.compute(netWorths, configValues);
    } catch (e) {
      console.error('指标计算错误:', e);
      return null;
    }
  }, [indicator, netWorths, configValues]);

  // 生成 ECharts option（含趋势通道买卖点标记）
  const chartOption = useMemo(() => {
    if (!indicator || !result) return null;
    try {
      const base = indicator.getChartOption(result, netWorths);

      // 趋势通道：叠加买卖点 scatter 系列
      if (selectedId === TREND_CHANNEL_ID && transactions && transactions.length > 0) {
        const resultAny = result as any;
        const pts = resultAny?.points as { date: string; nav: number }[] | undefined;
        if (pts && pts.length > 0) {
          const navByDate = new Map(pts.map((p) => [p.date, p.nav]));
          const buys: [string, number][] = [];
          const sells: [string, number][] = [];
          for (const tx of transactions) {
            const nav = navByDate.get(tx.date);
            if (nav === undefined) continue;
            if (tx.type === 'buy') buys.push([tx.date, nav]);
            else if (tx.type === 'sell') sells.push([tx.date, nav]);
          }
          const series = base.series as any[];
          if (buys.length > 0) {
            series.push({
              id: 'tx-buy', name: '买入', type: 'scatter' as const,
              data: buys, symbol: 'circle', symbolSize: 10,
              itemStyle: { color: colors.profit, borderColor: '#fff', borderWidth: 1 },
              z: 20,
            });
          }
          if (sells.length > 0) {
            series.push({
              id: 'tx-sell', name: '卖出', type: 'scatter' as const,
              data: sells, symbol: 'circle', symbolSize: 10,
              itemStyle: { color: colors.loss, borderColor: '#fff', borderWidth: 1 },
              z: 20,
            });
          }
        }
      }

      return base;
    } catch (e) {
      return null;
    }
  }, [indicator, result, netWorths, transactions, selectedId]);

  // 基金数据标识，切换时重建图表实例（含交易数据变化）
  const chartKey = useMemo(() => {
    if (netWorths.length === 0) return 'empty';
    return `${netWorths[0]?.date}-${netWorths[netWorths.length - 1]?.date}-${netWorths.length}-tx${transactions?.length ?? 0}`;
  }, [netWorths, transactions]);

  // 图表就绪后在微任务中延迟添加 dataZoom
  const handleChartReady = useCallback((instance: any) => {
    Promise.resolve().then(() => {
      try {
        instance.setOption({
          dataZoom: [{ type: 'inside', start: 0, end: 100, minValueSpan: 10 }],
        });
      } catch {}
    });
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-[90vw] !w-[1100px] !h-[85vh] !max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
        style={{ backgroundColor: colors.bg, borderRadius: 16 }}
      >
        <DialogTitle className="sr-only">指标分析</DialogTitle>

        <div
          className="flex items-center justify-between px-6 py-3 shrink-0"
          style={{ borderBottom: `1px solid ${colors.borderLight}`, backgroundColor: colors.bgCard }}
        >
          <span className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
            指标分析
          </span>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* 左侧配置面板 */}
          <div
            className="w-[220px] shrink-0 flex flex-col"
            style={{ borderRight: `1px solid ${colors.borderLight}`, backgroundColor: colors.bgCard }}
          >
            <ScrollArea className="flex-1 px-4 py-4">
              <div className="mb-5">
                <div className="text-[10px] font-semibold tracking-wide mb-2" style={{ color: colors.textTertiary }}>
                  选择指标
                </div>
                <select
                  className="w-full px-2.5 py-2 rounded-lg text-[12px] border cursor-pointer"
                  style={{ backgroundColor: colors.bgInput, borderColor: colors.borderLight, color: colors.textPrimary }}
                  value={selectedId}
                  onChange={(e) => handleIndicatorChange(e.target.value)}
                >
                  {indicators.map((ind) => (
                    <option key={ind.id} value={ind.id}>{ind.name}</option>
                  ))}
                </select>
                {indicator?.description && (
                  <div className="text-[10px] mt-1.5 leading-relaxed" style={{ color: colors.textTertiary }}>
                    {indicator.description}
                  </div>
                )}
              </div>

              {indicator?.configSchema.fields.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold tracking-wide mb-2" style={{ color: colors.textTertiary }}>
                    参数配置
                  </div>
                  <div className="flex flex-col gap-3">
                    {indicator.configSchema.fields.map((field) => (
                      <ConfigControl
                        key={field.key}
                        field={field}
                        value={configValues[field.key] ?? field.defaultValue}
                        onChange={handleConfigChange}
                      />
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* 右侧图表 */}
          <div className="flex-1 p-4 min-w-0">
            {chartOption ? (
              <ReactEChartsCore
                key={chartKey}
                echarts={echarts}
                option={chartOption}
                style={{ height: '100%', width: '100%' }}
                onChartReady={handleChartReady}
                lazyUpdate
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-xs" style={{ color: colors.textTertiary }}>
                  {netWorths.length === 0 ? '暂无净值数据' : '指标计算中...'}
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
