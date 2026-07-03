// 指标配置读取 hook - 按基金读取，挂载时自动加载
import { useCallback, useEffect, useState } from 'react';
import { getIndicatorConfig } from '@/services/indicatorConfig';
import type { IndicatorConfigMap } from '@/types';

export function useIndicatorConfig(fundCode: string): {
  configMap: IndicatorConfigMap | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [configMap, setConfigMap] = useState<IndicatorConfigMap | null>(null);

  const refresh = useCallback(async () => {
    const map = await getIndicatorConfig(fundCode);
    setConfigMap(map);
  }, [fundCode]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { configMap, loading: configMap === null, refresh };
}
