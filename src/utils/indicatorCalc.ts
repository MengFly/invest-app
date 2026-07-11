/**
 * 指标计算工具函数
 * 提供 SMA、EMA、标准差、趋势通道等计算功能
 */

/** 计算简单移动平均线 (SMA) */
export function calcSMA(values: number[], period: number): (number | null)[] {
  if (period <= 0 || values.length === 0) return [];
  const result: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) {
      result.push(sum / period);
    } else {
      result.push(null);
    }
  }
  return result;
}

/** 计算指数移动平均线 (EMA) */
export function calcEMA(values: number[], period: number): (number | null)[] {
  if (period <= 0 || values.length === 0) return [];
  const alpha = 2 / (period + 1);
  const result: (number | null)[] = [];
  let ema = values[0];
  result.push(ema); // EMA[0] = values[0]
  for (let i = 1; i < values.length; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema;
    if (i >= period - 1 || true) {
      result.push(ema);
    } else {
      result.push(null);
    }
  }
  return result;
}

/** 计算滚动标准差（在每个时间点取前 period 天计算局部标准差） */
export function calcRollingStd(values: number[], period: number): (number | null)[] {
  if (period <= 0 || values.length === 0) return [];
  const result: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    const slice = values.slice(i - period + 1, i + 1);
    const mean = slice.reduce((s, v) => s + v, 0) / slice.length;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length;
    result.push(Math.sqrt(variance));
  }
  return result;
}

/** 计算全局标准差（使用全部数据，返回一个固定值） */
export function calcGlobalStd(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** 计算指定范围的标准差（只取最近 N 天的数据算一个全局值） */
export function calcRecentGlobalStd(values: number[], days: number): number {
  const slice = days > 0 && days < values.length ? values.slice(-days) : values;
  return calcGlobalStd(slice);
}

export interface TrendChannelInput {
  values: number[];
  dates: string[];
}

export interface TrendChannelAvgConfig {
  type: 'sma' | 'ema';
  period: number;
}

export interface TrendChannelStdConfig {
  type: 'rolling' | 'global';
  period: number; // 滚动天数（rolling 时使用）或截取天数（global 时使用），0 表示全部数据
}

export interface TrendChannelConfig {
  avg: TrendChannelAvgConfig;
  std: TrendChannelStdConfig;
}

export interface TrendChannelResultPoint {
  date: string;
  nav: number;
  avg: number | null;
  upper: number | null;
  lower: number | null;
}

export interface TrendChannelResult {
  points: TrendChannelResultPoint[];
  stdValue: number | null; // 实际使用的标准差（全局模式有值，滚动模式为 null）
  config: TrendChannelConfig;
}

/** 完整计算趋势通道 */
export function calcTrendChannel(input: TrendChannelInput, config: TrendChannelConfig): TrendChannelResult {
  const { values, dates } = input;
  const { avg, std } = config;

  // 1. 计算均线
  const avgLine = avg.type === 'sma' ? calcSMA(values, avg.period) : calcEMA(values, avg.period);

  // 2. 计算残差 = 每日净值 - 当日均线（反映净值偏离趋势的程度）
  const residuals: (number | null)[] = values.map((v, i) => {
    const a = avgLine[i];
    return a !== null ? v - a : null;
  });

  // 3. 对残差计算标准差
  let stdValue: number | null = null;
  let stdLine: (number | null)[];

  if (std.type === 'rolling') {
    // 滚动标准差：在每个时间点取前 N 天的残差计算局部标准差
    const rollingPeriod = std.period > 0 ? std.period : avg.period;
    stdLine = calcRollingStdFromResiduals(residuals, rollingPeriod);
  } else {
    // 全局标准差：取全部（或最近 N 天）残差算一个固定值
    const validResiduals = residuals.filter((r): r is number => r !== null);
    const allResiduals = std.period > 0 ? validResiduals.slice(-std.period) : validResiduals;
    stdValue = allResiduals.length > 0 ? calcGlobalStd(allResiduals) : 0;
    stdLine = values.map(() => stdValue!);
  }

  // 4. 构建结果
  const points: TrendChannelResultPoint[] = values.map((nav, i) => {
    const avgVal = avgLine[i];
    const stdVal = stdLine[i];
    const upper = avgVal !== null && stdVal !== null ? avgVal + stdVal : null;
    const lower = avgVal !== null && stdVal !== null ? avgVal - stdVal : null;
    return {
      date: dates[i] || '',
      nav,
      avg: avgVal,
      upper,
      lower,
    };
  });

  return { points, stdValue, config };
}

/** 对残差序列计算滚动标准差（跳过 null 值） */
function calcRollingStdFromResiduals(residuals: (number | null)[], period: number): (number | null)[] {
  if (period <= 0 || residuals.length === 0) return [];
  const result: (number | null)[] = [];
  for (let i = 0; i < residuals.length; i++) {
    if (residuals[i] === null) {
      result.push(null);
      continue;
    }
    // 取当前点及之前最多 period 个非 null 残差
    const slice: number[] = [];
    for (let j = i; j >= 0 && slice.length < period; j--) {
      if (residuals[j] !== null) slice.unshift(residuals[j]!);
    }
    if (slice.length < 2) {
      // 至少需要 2 个数据点才能算标准差
      result.push(null);
      continue;
    }
    const mean = slice.reduce((s, v) => s + v, 0) / slice.length;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length;
    result.push(Math.sqrt(variance));
  }
  return result;
}
