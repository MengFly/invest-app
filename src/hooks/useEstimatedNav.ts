// 估算净值 hooks - 支持批量和单个基金的实时估值拉取 + 1分钟轮询
import { useState, useEffect, useMemo } from 'react';
import { fetchEstimatedNav } from '@/services/fundApi';
import type { EstimatedNavData } from '@/types';

/**
 * Hook for single fund estimated nav
 * - On mount: request immediately
 * - Auto refresh every 60 seconds
 * - Returns null if no code or request failed
 */
export function useEstimatedNav(code: string | undefined): EstimatedNavData | null {
  const [data, setData] = useState<EstimatedNavData | null>(null);

  useEffect(() => {
    if (!code) {
      setData(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const doFetch = async () => {
      const res = await fetchEstimatedNav(code);
      if (!cancelled) {
        setData(res);
      }
    };

    doFetch();
    timer = setInterval(doFetch, 60 * 1000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [code]);

  return data;
}

/**
 * Hook for bulk estimated nav (for fund list page)
 * - request all codes immediately
 * - auto refresh every 60 seconds
 * - returns Record<code, EstimatedNavData | null>
 * - request failure sets null, doesn't affect other codes
 */
export function useAllEstimatedNavs(codes: string[]): Record<string, EstimatedNavData | null> {
  const [result, setResult] = useState<Record<string, EstimatedNavData | null>>({});

  useEffect(() => {
    if (codes.length === 0) {
      setResult({});
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const doFetchAll = async () => {
      const nextResult: Record<string, EstimatedNavData | null> = {};
      // JSONP 全局回调不能并行，改为串行
      for (const code of codes) {
        if (cancelled) return;
        const data = await fetchEstimatedNav(code);
        nextResult[code] = data;
      }
      if (!cancelled) {
        setResult(nextResult);
      }
    };

    doFetchAll();
    timer = setInterval(doFetchAll, 60 * 1000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [codes]);

  return useMemo(() => result, [result]);
}