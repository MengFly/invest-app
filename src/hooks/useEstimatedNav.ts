/**
 * 估算净值 Hook
 * 封装天天基金实时估算净值的数据获取逻辑
 * 使用模块级缓存避免重复请求，5 分钟轮询刷新
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchEstimatedNav } from '@/services/fundApi';
import type { EstimatedNavData } from '@/types';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 分钟

// 模块级缓存，跨 Hook 实例共享
const cache = new Map<string, { data: EstimatedNavData | null; ts: number }>();

function getCached(code: string): EstimatedNavData | null | undefined {
  const entry = cache.get(code);
  if (entry && Date.now() - entry.ts < POLL_INTERVAL) {
    return entry.data;
  }
  return undefined; // 表示缓存过期或不存在
}

function setCached(code: string, data: EstimatedNavData | null): void {
  cache.set(code, { data, ts: Date.now() });
}

/**
 * 获取单只基金的估算净值（详情页使用）
 * 优先读缓存，缓存过期则发起 JSONP 请求
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

    // 检查缓存
    const cached = getCached(code);
    if (cached !== undefined) {
      setData(cached);
      setLoading(false);
      return;
    }

    cancelledRef.current = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const result = await fetchEstimatedNav(code);
        if (cancelledRef.current) return;
        setCached(code, result);
        setData(result);
      } catch {
        if (!cancelledRef.current) {
          setError('获取估算净值失败');
        }
      } finally {
        if (!cancelledRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => { cancelledRef.current = true; };
  }, [code, refreshFlag]);

  return { data, loading, error, refresh };
}

/**
 * 批量获取多只基金的估算净值（列表页使用）
 * 串行请求避免 JSONP 全局回调冲突，共享模块级缓存
 */
export function useAllEstimatedNavs(codes: string[]): Record<string, EstimatedNavData | null> {
  const [navs, setNavs] = useState<Record<string, EstimatedNavData | null>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    const result: Record<string, EstimatedNavData | null> = {};
    for (const code of codes) {
      const cached = getCached(code);
      if (cached !== undefined) {
        result[code] = cached;
      } else {
        try {
          const data = await fetchEstimatedNav(code);
          setCached(code, data);
          result[code] = data;
        } catch {
          // 单个失败不影响其他
        }
      }
    }
    setNavs((prev) => {
      // 合并新旧数据，保留未变化的缓存值
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