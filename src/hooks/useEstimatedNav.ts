/**
 * 估算净值 Hook
 * 从 Supabase 查询基金实时估算净值
 * 使用 localStorage 缓存避免重复请求，5 分钟轮询刷新
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchEstimatedNav } from '@/services/fundApi';
import { getCache } from '@/services/cache';
import type { EstimatedNavData } from '@/types';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 分钟
const EST_NAV_CACHE_TTL = 5 * 60 * 1000; // 5 分钟

/**
 * 获取单只基金的估算净值（详情页使用）
 * 优先读缓存，缓存过期则从 Supabase 查询
 */
export function useEstimatedNav(code: string | undefined): {
  data: EstimatedNavData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [data, setData] = useState<EstimatedNavData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const cancelledRef = useRef(false);

  const refresh = useCallback(() => setRefreshFlag((f) => f + 1), []);

  useEffect(() => {
    if (!code) {
      setData(null);
      setLoading(false);
      return;
    }

    cancelledRef.current = false;
    setLoading(true);

    const doFetch = async () => {
      try {
        const result = await getCache<EstimatedNavData | null>(
          `cache:estimated-nav:${code}`,
          EST_NAV_CACHE_TTL,
          () => fetchEstimatedNav(code)
        );
        if (!cancelledRef.current) {
          setData(result);
        }
      } catch {
        if (!cancelledRef.current) {
          setError('获取估算净值失败');
        }
      } finally {
        if (!cancelledRef.current) {
          setLoading(false);
        }
      }
    };

    doFetch();

    // 5 分钟轮询
    const timer = setInterval(doFetch, POLL_INTERVAL);

    return () => {
      cancelledRef.current = true;
      clearInterval(timer);
    };
  }, [code, refreshFlag]);

  return { data, loading, error, refresh };
}

/**
 * 批量获取多只基金的估算净值（列表页使用）
 * 串行请求避免并发冲突，共享 localStorage 缓存
 */
export function useAllEstimatedNavs(codes: string[]): Record<string, EstimatedNavData | null> {
  const [navs, setNavs] = useState<Record<string, EstimatedNavData | null>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    const result: Record<string, EstimatedNavData | null> = {};
    for (const code of codes) {
      try {
        const data = await getCache<EstimatedNavData | null>(
          `cache:estimated-nav:${code}`,
          EST_NAV_CACHE_TTL,
          () => fetchEstimatedNav(code)
        );
        result[code] = data;
      } catch {
        // 单个失败不影响其他
      }
    }
    setNavs((prev) => {
      const merged = { ...prev };
      for (const code of codes) {
        if (result[code] !== undefined) {
          merged[code] = result[code];
        }
      }
      return merged;
    });
  }, [codes]);

  useEffect(() => {
    if (codes.length === 0) {
      setNavs({});
      return;
    }

    fetchAll();

    // 5 分钟轮询
    intervalRef.current = setInterval(fetchAll, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchAll, codes.length]);

  return navs;
}