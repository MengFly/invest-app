// 估算净值 hooks - 支持批量和单个基金的实时估值拉取 + 5分钟轮询
// 使用模块级缓存避免列表页和详情页重复请求同一基金
import { useState, useEffect, useMemo } from 'react';
import { fetchEstimatedNav } from '@/services/fundApi';
import type { EstimatedNavData } from '@/types';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 分钟

// 模块级共享缓存，列表页和详情页共用
const cache = new Map<string, { data: EstimatedNavData | null; ts: number }>();

function getCached(code: string): EstimatedNavData | null | undefined {
  const entry = cache.get(code);
  if (entry && Date.now() - entry.ts < POLL_INTERVAL) {
    return entry.data;
  }
  return undefined; // 无缓存或已过期
}

function setCached(code: string, data: EstimatedNavData | null) {
  cache.set(code, { data, ts: Date.now() });
}

/**
 * Hook for single fund estimated nav
 * - On mount: check cache first, fetch if stale
 * - Auto refresh every 5 minutes
 * - Returns null if no code or request failed
 */
export function useEstimatedNav(code: string | undefined): EstimatedNavData | null {
  const [data, setData] = useState<EstimatedNavData | null>(() => {
    if (!code) return null;
    const cached = getCached(code);
    return cached !== undefined ? cached : null;
  });

  useEffect(() => {
    if (!code) {
      setData(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const doFetch = async () => {
      const res = await fetchEstimatedNav(code);
      setCached(code, res);
      if (!cancelled) {
        setData(res);
      }
    };

    // 仅在无有效缓存时发起网络请求
    const cached = getCached(code);
    if (cached === undefined) {
      doFetch();
    } else {
      setData(cached);
    }

    timer = setInterval(doFetch, POLL_INTERVAL);

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
 * - auto refresh every 5 minutes
 * - returns Record<code, EstimatedNavData | null>
 * - request failure sets null, doesn't affect other codes
 */
export function useAllEstimatedNavs(codes: string[]): Record<string, EstimatedNavData | null> {
  const [result, setResult] = useState<Record<string, EstimatedNavData | null>>(() => {
    // 初始化时从缓存读取
    const init: Record<string, EstimatedNavData | null> = {};
    for (const code of codes) {
      const cached = getCached(code);
      if (cached !== undefined) init[code] = cached;
    }
    return init;
  });

  useEffect(() => {
    if (codes.length === 0) {
      setResult({});
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const doFetchAll = async () => {
      const nextResult: Record<string, EstimatedNavData | null> = { ...result };
      // JSONP 全局回调不能并行，改为串行
      for (const code of codes) {
        if (cancelled) return;

        // 有有效缓存则跳过
        const cached = getCached(code);
        if (cached !== undefined) {
          nextResult[code] = cached;
          continue;
        }

        const data = await fetchEstimatedNav(code);
        setCached(code, data);
        nextResult[code] = data;
      }
      if (!cancelled) {
        setResult(nextResult);
      }
    };

    doFetchAll();
    timer = setInterval(doFetchAll, POLL_INTERVAL);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [codes]);

  return useMemo(() => result, [result]);
}