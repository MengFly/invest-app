// 基金数据获取 hooks - 封装接口请求 + 缓存 + 状态管理
import { useState, useEffect, useCallback } from 'react';
import { fetchFundList, fetchFundBasicInfo, fetchFundNetWorth } from '@/services/fundApi';
import { getCached, setCached, CACHE_KEYS, CACHE_TTL, fundInfoKey, fundNetWorthKey } from '@/services/cache';
import type { FundListItem, FundBasicInfo, NetWorthRecord } from '@/types';

// 通用 hook 返回结构
interface HookResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * 拉取基金列表（优先读缓存）
 */
export function useFundList(): HookResult<FundListItem[]> {
  const [data, setData] = useState<FundListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(0);

  const refresh = useCallback(() => setRefreshFlag((f) => f + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      // 1. 优先读缓存
      let cached: FundListItem[] | null = null;
      try {
        cached = await getCached<FundListItem[]>(CACHE_KEYS.FUND_LIST);
      } catch {
        // 缓存读取失败，忽略
      }
      if (cancelled) return;
      if (cached) {
        setData(cached);
        setLoading(false);
        return; // 缓存有效，跳过网络请求
      }

      // 2. 拉取最新数据
      try {
        const list = await fetchFundList();
        if (cancelled) return;
        setData(list);
        setLoading(false);
        try {
          await setCached(CACHE_KEYS.FUND_LIST, list, CACHE_TTL.FUND_LIST);
        } catch { /* ignore */ }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '基金列表加载失败');
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [refreshFlag]);

  return { data, loading, error, refresh };
}

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
      const key = fundInfoKey(code);
      let cached: FundBasicInfo | null = null;
      try {
        cached = await getCached<FundBasicInfo>(key);
      } catch { /* ignore */ }
      if (cancelled) return;
      if (cached) {
        setData(cached);
        setLoading(false);
        return; // 缓存有效，跳过网络请求
      }

      try {
        const info = await fetchFundBasicInfo(code);
        if (cancelled) return;
        setData(info);
        setLoading(false);
        try {
          await setCached(key, info, CACHE_TTL.FUND_INFO);
        } catch { /* ignore */ }
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
      const key = fundNetWorthKey(code);
      let cached: NetWorthRecord[] | null = null;
      try {
        cached = await getCached<NetWorthRecord[]>(key);
      } catch { /* ignore */ }
      if (cancelled) return;
      if (cached) {
        setData(cached);
        setLoading(false);
        return; // 缓存有效，跳过网络请求
      }

      try {
        const records = await fetchFundNetWorth(code);
        if (cancelled) return;
        setData(records);
        setLoading(false);
        try {
          await setCached(key, records, CACHE_TTL.FUND_NETWORTH);
        } catch { /* ignore */ }
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
