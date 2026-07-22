// 基金数据获取 hooks - 封装接口请求 + 缓存 + 状态管理
import { useState, useEffect, useCallback } from 'react';
import { fetchFundBasicInfo, fetchFundNetWorth } from '@/services/fundApi';
import { getCache } from '@/services/cache';
import type { FundBasicInfo, NetWorthRecord } from '@/types';

// 通用 hook 返回结构
interface HookResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 小时

/**
 * 拉取基金基本信息（优先读缓存）
 */
export function useFundBasicInfo(code: string | undefined): HookResult<FundBasicInfo> {
  const [data, setData] = useState<FundBasicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(0);

  const refresh = useCallback(() => setRefreshFlag((f) => f + 1), []);

  useEffect(() => {
    if (!code) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const cacheKey = `cache:fund-info:${code}`;
      try {
        const info = await getCache<FundBasicInfo>(cacheKey, CACHE_TTL, () => fetchFundBasicInfo(code));
        if (cancelled) return;
        setData(info);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '基金信息加载失败');
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [code, refreshFlag]);

  return { data, loading, error, refresh };
}

/**
 * 拉取基金净值数据（优先读缓存）
 */
export function useFundNetWorth(code: string | undefined): HookResult<NetWorthRecord[]> {
  const [data, setData] = useState<NetWorthRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(0);

  const refresh = useCallback(() => setRefreshFlag((f) => f + 1), []);

  useEffect(() => {
    if (!code) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const cacheKey = `cache:fund-net-worth:${code}`;
      try {
        const records = await getCache<NetWorthRecord[]>(cacheKey, CACHE_TTL, () => fetchFundNetWorth(code));
        if (cancelled) return;
        setData(records);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '基金净值加载失败');
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [code, refreshFlag]);

  return { data, loading, error, refresh };
}