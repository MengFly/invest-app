// 指标计算结果 hook - 按基金读取配置并计算指标
import { useState, useEffect, useMemo } from 'react';
import { getIndicatorConfig } from '@/services/indicatorConfig';
import { getAllIndicators } from '@/indicators';
import type {
  IndicatorContext,
  IndicatorConfigMap,
  IndicatorDefinition,
  LayerDescriptor,
  ValueResult,
} from '@/types';

interface UseIndicatorResultsReturn {
  topResults: { def: IndicatorDefinition; value: ValueResult }[];
  navChartLayers: LayerDescriptor[];
  profitChartLayers: LayerDescriptor[];
  loading: boolean;
}

export function useIndicatorResults(ctx: IndicatorContext): UseIndicatorResultsReturn {
  const [configMap, setConfigMap] = useState<IndicatorConfigMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    getIndicatorConfig(ctx.code).then((map) => {
      if (!cancelled) setConfigMap(map);
    });
    return () => {
      cancelled = true;
    };
  }, [ctx.code]);

  const loading = configMap === null;

  const { topResults, navChartLayers, profitChartLayers } = useMemo(() => {
    if (!configMap) {
      return { topResults: [], navChartLayers: [], profitChartLayers: [] };
    }

    const top: { def: IndicatorDefinition; value: ValueResult; topOrder?: number }[] = [];
    const nav: LayerDescriptor[] = [];
    const profit: LayerDescriptor[] = [];

    for (const def of getAllIndicators()) {
      const state = configMap[def.id];
      if (!state || !state.enabled) continue;

      const result = def.calculate(ctx, state.config);
      if (!result) continue;

      if (result.position === 'top') {
        top.push({ def, value: result.value, topOrder: state.topOrder });
      } else if (result.position === 'navChart') {
        nav.push(...result.layers);
      } else if (result.position === 'profitChart') {
        profit.push(...result.layers);
      }
    }

    top.sort((a, b) => {
      const aOrder = a.topOrder ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.topOrder ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });

    return {
      topResults: top.map(({ def, value }) => ({ def, value })),
      navChartLayers: nav,
      profitChartLayers: profit,
    };
  }, [ctx, configMap]);

  return { topResults, navChartLayers, profitChartLayers, loading };
}
