// 持仓聚合 hooks - 读取持仓/交易记录并聚合计算
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getOrderedHoldings, getHoldings } from '@/services/portfolio';
import { getTransactions } from '@/services/transaction';
import { useFundNetWorth, useFundBasicInfo } from '@/hooks/useFund';
import { summarizeHolding } from '@/utils/holdingCalc';
import type { Holding, Transaction, HoldingSummary } from '@/types';

/**
 * 读取排序后的持仓列表 (仅元信息, 不含聚合字段)
 * 用于持仓列表页展示基金卡片, 聚合由各卡片子组件 useHoldingDetail 完成
 * @param externalTrigger 可选外部触发器（如添加基金后的全局刷新）
 */
export function useHoldings(externalTrigger?: number): {
  holdings: Holding[];
  loading: boolean;
  refresh: () => void;
} {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshFlag, setRefreshFlag] = useState(0);

  const refresh = useCallback(() => setRefreshFlag((f) => f + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const list = await getOrderedHoldings();
      if (cancelled) return;
      setHoldings(list);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshFlag, externalTrigger]);

  return { holdings, loading, refresh };
}

/**
 * 读取某基金的全部交易记录 (按 createdAt 降序)
 */
export function useTransactions(fundCode: string | undefined): {
  data: Transaction[];
  loading: boolean;
  refresh: () => void;
} {
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshFlag, setRefreshFlag] = useState(0);

  const refresh = useCallback(() => setRefreshFlag((f) => f + 1), []);

  useEffect(() => {
    if (!fundCode) {
      setData([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const list = await getTransactions(fundCode);
      if (cancelled) return;
      setData(list);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fundCode, refreshFlag]);

  return { data, loading, refresh };
}

/**
 * 读取单个持仓的聚合详情 (HoldingSummary)
 * 内部并行: 持仓元信息 + 交易记录 + 真实净值 → summarizeHolding
 * 若该基金不在持仓中, 返回 null
 */
export function useHoldingDetail(code: string | undefined): {
  summary: HoldingSummary | null;
  loading: boolean;
  refresh: () => void;
} {
  const [holding, setHolding] = useState<Holding | null>(null);
  const [holdingLoading, setHoldingLoading] = useState(true);
  const [refreshFlag, setRefreshFlag] = useState(0);

  // 交易记录
  const { data: transactions, loading: txLoading, refresh: refreshTx } = useTransactions(code);
  // 真实净值 (复用现有 hook, 含缓存)
  const { data: netWorths, loading: navLoading, refresh: refreshNav } = useFundNetWorth(code);
  // 基金基本信息（含管理费率）
  const { data: basicInfo } = useFundBasicInfo(code);

  const refresh = useCallback(() => {
    setRefreshFlag((f) => f + 1);
    refreshTx();
    refreshNav();
  }, [refreshTx, refreshNav]);

  // 读取单个 holding 元信息
  useEffect(() => {
    if (!code) {
      setHolding(null);
      setHoldingLoading(false);
      return;
    }
    let cancelled = false;
    setHoldingLoading(true);
    (async () => {
      const all = await getHoldings();
      if (cancelled) return;
      const found = all.find((h) => h.code === code) ?? null;
      setHolding(found);
      setHoldingLoading(false);
    })();
    return () => { cancelled = true; };
  }, [code, refreshFlag]);

  // 聚合计算
  const summary = useMemo<HoldingSummary | null>(() => {
    if (!holding) return null;
    // 取第一条管理费率
    const mgmtFeeRate = basicInfo?.managementFees?.[0]?.value
      ? basicInfo.managementFees[0].value / 100
      : undefined;
    return summarizeHolding(holding, transactions, netWorths, mgmtFeeRate);
  }, [holding, transactions, netWorths, basicInfo]);

  const loading = holdingLoading || txLoading || (holding && navLoading && !netWorths ? true : false);

  return { summary, loading, refresh };
}
