import { useState, useEffect } from 'react';
import { getOrderedHoldings } from '@/services/portfolio';
import { getTransactions } from '@/services/transaction';
import { fetchFundNetWorth, fetchFundBasicInfo } from '@/services/fundApi';
import { getCache } from '@/services/cache';
import { summarizeHolding } from '@/utils/holdingCalc';
import type { FundBasicInfo, NetWorthRecord, HoldingSummary } from '@/types';

interface UseAllSummariesResult {
  summaries: Record<string, HoldingSummary>;
  loading: boolean;
}

const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 小时

async function fetchNetWorthCached(code: string): Promise<NetWorthRecord[] | null> {
  try {
    return await getCache<NetWorthRecord[]>(`cache:fund-net-worth:${code}`, CACHE_TTL, () => fetchFundNetWorth(code));
  } catch {
    return null;
  }
}

async function fetchBasicInfoCached(code: string): Promise<FundBasicInfo | null> {
  try {
    return await getCache<FundBasicInfo>(`cache:fund-info:${code}`, CACHE_TTL, () => fetchFundBasicInfo(code));
  } catch {
    return null;
  }
}

export function useAllSummaries(refreshTrigger: number): UseAllSummariesResult {
  const [summaries, setSummaries] = useState<Record<string, HoldingSummary>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const holdings = await getOrderedHoldings();
      if (cancelled) return;

      if (holdings.length === 0) {
        setSummaries({});
        setLoading(false);
        return;
      }

      const result: Record<string, HoldingSummary> = {};

      for (const h of holdings) {
        if (cancelled) break;
        const [transactions, netWorths, basicInfo] = await Promise.all([
          getTransactions(h.code),
          fetchNetWorthCached(h.code),
          fetchBasicInfoCached(h.code),
        ]);
        if (cancelled) break;
        const mgmtFeeRate = basicInfo?.managementFees?.[0]?.value
          ? basicInfo.managementFees[0].value / 100
          : undefined;
        result[h.code] = summarizeHolding(h, transactions, netWorths ?? [], mgmtFeeRate);
      }

      if (!cancelled) {
        setSummaries(result);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [refreshTrigger]);

  return { summaries, loading };
}