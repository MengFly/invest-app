// 指标配置持久化服务 - localStorage 存储 enabled/config/topOrder
// 配置按基金隔离，每个基金独立存储
import { getAllIndicators } from '@/indicators/registry';
import type { IndicatorConfigMap, IndicatorState, IndicatorConfig } from '@/types';

const INDICATOR_CONFIG_PREFIX = 'portfolio:indicator-config:';

function storageKey(fundCode: string): string {
  return `${INDICATOR_CONFIG_PREFIX}${fundCode}`;
}

// 默认启用的指标 id 列表
const DEFAULT_ENABLED_IDS = ['hold-amount', 'hold-profit', 'cost-line'];

/**
 * 读取指定基金的所有指标持久化状态
 * 首次调用（无存储）时返回所有已注册指标的默认状态：
 *  - hold-amount, hold-profit, cost-line 默认 enabled=true
 *  - 其他指标默认 enabled=false
 *  - config = def.defaultConfig
 */
export async function getIndicatorConfig(fundCode: string): Promise<IndicatorConfigMap> {
  try {
    const raw = localStorage.getItem(storageKey(fundCode));
    const stored: IndicatorConfigMap = raw ? JSON.parse(raw) : {};
    const result: IndicatorConfigMap = {};
    for (const def of getAllIndicators()) {
      if (stored[def.id]) {
        result[def.id] = mergeWithDefault(def.id, stored[def.id], def.defaultConfig);
      } else {
        result[def.id] = {
          enabled: DEFAULT_ENABLED_IDS.includes(def.id),
          config: { ...def.defaultConfig },
        };
      }
    }
    return result;
  } catch {
    return buildDefaultConfig();
  }
}

export async function getIndicatorState(fundCode: string, id: string): Promise<IndicatorState | null> {
  const all = await getIndicatorConfig(fundCode);
  return all[id] ?? null;
}

export async function getEnabledIndicators(fundCode: string): Promise<string[]> {
  const all = await getIndicatorConfig(fundCode);
  return Object.entries(all)
    .filter(([, state]) => state.enabled)
    .map(([id]) => id);
}

export async function setIndicatorState(
  fundCode: string,
  id: string,
  partial: Partial<IndicatorState>
): Promise<void> {
  try {
    const all = await getIndicatorConfig(fundCode);
    const def = getAllIndicators().find((d) => d.id === id);
    const current: IndicatorState = all[id] ?? {
      enabled: false,
      config: def ? { ...def.defaultConfig } : {},
    };
    const next: IndicatorState = {
      enabled: partial.enabled ?? current.enabled,
      config: partial.config ?? current.config,
      topOrder: partial.topOrder ?? current.topOrder,
    };
    all[id] = next;
    localStorage.setItem(storageKey(fundCode), JSON.stringify(all));
  } catch {
    // 写入失败静默, 不影响主流程
  }
}

export async function setIndicatorEnabled(fundCode: string, id: string, enabled: boolean): Promise<void> {
  await setIndicatorState(fundCode, id, { enabled });
}

export async function setIndicatorConfig(fundCode: string, id: string, config: Partial<IndicatorConfig>): Promise<void> {
  const current = await getIndicatorState(fundCode, id);
  const nextConfig: IndicatorConfig = { ...(current?.config ?? {}) };
  for (const [k, v] of Object.entries(config)) {
    if (v !== undefined) nextConfig[k] = v;
  }
  await setIndicatorState(fundCode, id, { config: nextConfig });
}

// ===== 内部辅助 =====

function buildDefaultConfig(): IndicatorConfigMap {
  const result: IndicatorConfigMap = {};
  for (const def of getAllIndicators()) {
    result[def.id] = {
      enabled: DEFAULT_ENABLED_IDS.includes(def.id),
      config: { ...def.defaultConfig },
    };
  }
  return result;
}

function mergeWithDefault(
  _id: string,
  stored: IndicatorState,
  defaultConfig: IndicatorConfig
): IndicatorState {
  const mergedConfig: IndicatorConfig = { ...defaultConfig, ...stored.config };
  return {
    enabled: stored.enabled ?? false,
    config: mergedConfig,
    topOrder: stored.topOrder,
  };
}
