/**
 * 指标注册中心
 * 定义指标接口，支持注册和获取指标，每个指标有独立的配置和图表渲染逻辑
 */
import type { EChartsOption } from 'echarts';
import type { NetWorthRecord } from '@/types';
import { calcTrendChannel } from './indicatorCalc';
import type { TrendChannelConfig } from './indicatorCalc';
import { colors } from '@/theme';

/** 将 hex 颜色转为 rgba 字符串 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ========== 配置定义 ==========

/** 配置项元信息（用于渲染配置UI） */
export interface ConfigField {
  key: string;
  label: string;
  type: 'select' | 'number';
  options?: { label: string; value: string | number }[];
  defaultValue: string | number;
  min?: number;
  max?: number;
}

/** 指标配置定义 */
export interface IndicatorConfigSchema {
  fields: ConfigField[];
}

// ========== 指标接口 ==========

export interface Indicator<TConfig = Record<string, any>, TResult = any> {
  id: string;
  name: string;
  description: string;
  /** 配置定义（用于渲染配置UI） */
  configSchema: IndicatorConfigSchema;
  /** 默认配置值 */
  defaultConfig: TConfig;
  /** 使用配置和数据计算指标结果 */
  compute(data: NetWorthRecord[], config: TConfig): TResult;
  /** 将计算结果渲染为 ECharts option */
  getChartOption(result: TResult, data: NetWorthRecord[]): EChartsOption;
}

// ========== 注册中心 ==========

const registry = new Map<string, Indicator>();

export function registerIndicator(indicator: Indicator) {
  registry.set(indicator.id, indicator);
}

export function getIndicator(id: string): Indicator | undefined {
  return registry.get(id);
}

export function getAllIndicators(): Indicator[] {
  return Array.from(registry.values());
}

// ========== 趋势通道指标实现 ==========

export interface TrendChannelConfigValues {
  avgType: 'sma' | 'ema';
  avgDays: number;
  stdType: 'rolling' | 'global';
  stdDays: number;
}

export interface TrendChannelPoint {
  date: string;
  nav: number;
  avg: number | null;
  upper: number | null;
  lower: number | null;
}

export interface TrendChannelResult {
  points: TrendChannelPoint[];
  stdValue: number | null;
  config: TrendChannelConfig;
}

export const TREND_CHANNEL_ID = 'trend-channel';

const trendChannelIndicator: Indicator<TrendChannelConfigValues, TrendChannelResult> = {
  id: TREND_CHANNEL_ID,
  name: '趋势通道',
  description: '在净值走势上绘制移动平均线及标准差通道',

  configSchema: {
    fields: [
      {
        key: 'avgType',
        label: '均线类型',
        type: 'select',
        defaultValue: 'sma',
        options: [
          { label: '简单移动平均 (SMA)', value: 'sma' },
          { label: '指数移动平均 (EMA)', value: 'ema' },
        ],
      },
      {
        key: 'avgDays',
        label: '均线天数',
        type: 'number',
        defaultValue: 20,
        min: 1,
        max: 365,
        options: [
          { label: '7天', value: 7 },
          { label: '20天', value: 20 },
          { label: '30天', value: 30 },
        ],
      },
      {
        key: 'stdType',
        label: '标准差类型',
        type: 'select',
        defaultValue: 'rolling',
        options: [
          { label: '滚动标准差', value: 'rolling' },
          { label: '全局标准差', value: 'global' },
        ],
      },
      {
        key: 'stdDays',
        label: '标准差天数',
        type: 'number',
        defaultValue: 0,
        min: 0,
        max: 365,
      },
    ],
  },

  defaultConfig: {
    avgType: 'sma',
    avgDays: 20,
    stdType: 'rolling',
    stdDays: 0,
  },

  compute(data: NetWorthRecord[], config: TrendChannelConfigValues): TrendChannelResult {
    const values = data.map((r) => r.netWorth);
    const dates = data.map((r) => r.date);
    return calcTrendChannel(
      { values, dates },
      {
        avg: { type: config.avgType, period: config.avgDays },
        std: {
          type: config.stdType,
          period: config.stdDays > 0 ? config.stdDays : 0,
        },
      },
    );
  },

  getChartOption(result: TrendChannelResult): EChartsOption {
    const { points, config } = result;
    const dates = points.map((p) => p.date);
    const avgData = points.map((p) => p.avg);
    const upperData = points.map((p) => p.upper);
    const lowerData = points.map((p) => p.lower);
    const navData = points.map((p) => p.nav);

    const periodLabel = config.avg.period || 20;
    const avgLabel = config.avg.type === 'sma' ? `SMA(${periodLabel})` : `EMA(${periodLabel})`;

    // 通道填充数据处理（使用 stack 机制实现上下通道线之间的精确填充）
    const lowerBase = lowerData.map((v) => (v !== null ? v : undefined));
    const diffFill = upperData.map((v, i) => {
      if (v === null || lowerData[i] === null) return undefined;
      return v - lowerData[i]!;
    });
    const upperClean = upperData.map((v) => (v !== null ? v : undefined));
    const channelColor = hexToRgba(colors.secondary, 0.18);
    const channelColorLight = hexToRgba(colors.secondary, 0.05);

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 500,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: colors.bgCard,
        borderColor: colors.borderLight,
        borderWidth: 1,
        textStyle: { color: colors.textPrimary, fontSize: 11 },
        formatter: (params: any) => {
          const date = params[0]?.axisValue || '';
          let html = `<div style="font-weight:600;margin-bottom:4px;font-family:Geist Mono,monospace;font-size:11px">${date}</div>`;
          for (const p of params) {
            const raw = p.value;
            if (raw === null || raw === undefined) continue;
            // scatter 系列的 data 是 [x, y] 数组，line 系列是单个数值
            const val: number = Array.isArray(raw) ? raw[1] : raw;
            if (val === null || val === undefined) continue;
            const label = p.seriesName;
            html += `<div style="display:flex;justify-content:space-between;gap:24px;font-size:11px;line-height:1.6">
              <span style="color:${colors.textTertiary}">${label}</span>
              <span style="color:${colors.textPrimary};font-family:Geist Mono,monospace;font-weight:500">
                ${val.toFixed(4)}
              </span>
            </div>`;
          }
          return html;
        },
      },
      legend: {
        data: ['净值', avgLabel, '上通道', '下通道'],
        textStyle: { color: colors.textSecondary, fontSize: 10 },
        bottom: 0,
        icon: 'roundRect',
        itemWidth: 14,
        itemHeight: 3,
      },
      grid: {
        left: 50,
        right: 16,
        top: 8,
        bottom: 36,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: colors.borderLight } },
        axisLabel: {
          color: colors.textTertiary,
          fontSize: 9,
          formatter: (v: string) => {
            const parts = v.split('-');
            return parts.length === 3 ? `${parts[1]}-${parts[2]}` : v;
          },
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        splitLine: {
          lineStyle: { color: colors.borderLight, type: 'dashed' as const },
        },
        axisLabel: {
          color: colors.textTertiary,
          fontSize: 9,
        },
      },
      series: [
        {
          id: 'nav',
          name: '净值',
          type: 'line',
          data: navData,
          smooth: false,
          symbol: 'none',
          lineStyle: { color: colors.primary, width: 2 },
          z: 10,
        },
        {
          id: 'avg-line',
          name: avgLabel,
          type: 'line',
          data: avgData.map((v) => (v !== null ? v : undefined)),
          smooth: false,
          symbol: 'none',
          lineStyle: { color: colors.secondary, width: 2 },
          connectNulls: false,
          z: 10,
        },
        // 通道底（不可见，作为 stack 基准）
        {
          id: 'channel-base',
          name: '通道底',
          type: 'line',
          data: lowerBase,
          smooth: false,
          symbol: 'none',
          lineStyle: { opacity: 0 },
          stack: 'channel',
          z: 1,
        },
        // 通道填充（stack 在基准之上，面积从下轨延伸到上轨）
        {
          id: 'channel-fill',
          name: '通道填充',
          type: 'line',
          data: diffFill,
          smooth: false,
          symbol: 'none',
          lineStyle: { opacity: 0 },
          stack: 'channel',
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: channelColor },
                { offset: 1, color: channelColorLight },
              ],
            },
          },
          z: 0,
        },
        // 上轨道虚线边界
        {
          id: 'upper-band',
          name: '上通道',
          type: 'line',
          data: upperClean,
          smooth: false,
          symbol: 'none',
          lineStyle: { color: colors.textTertiary, width: 1, type: 'dashed' as const },
          connectNulls: false,
          z: 2,
        },
        // 下轨道虚线边界
        {
          id: 'lower-band',
          name: '下通道',
          type: 'line',
          data: lowerData.map((v) => (v !== null ? v : undefined)),
          smooth: false,
          symbol: 'none',
          lineStyle: { color: colors.textTertiary, width: 1, type: 'dashed' as const },
          connectNulls: false,
          z: 2,
        },
      ],
    };
  },
};

registerIndicator(trendChannelIndicator);

export default trendChannelIndicator;
