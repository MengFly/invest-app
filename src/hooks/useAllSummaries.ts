import { useState, useEffect } from 'react';
import { getOrderedHoldings } from '@/services/portfolio';
import { getTransactions } from '@/services/transaction';
import { fetchFundNetWorth } from '@/services/fundApi';
import { getCached, setCached, fundNetWorthKey, CACHE_TTL } from '@/services/cache';
import { summarizeHolding } from '@/utils/holdingCalc';
import type { NetWorthRecord, HoldingSummary } from '@/types';

interface UseAllSummariesResult {
  summaries: Record<string, HoldingSummary>;
  loading: boolean;
}

async function fetchNetWorthCached(code: string): Promise<NetWorthRecord[] | null> {
  const key = fundNetWorthKey(code);
  try {
    const cached = await getCached<NetWorthRecord[]>(key);
    if (cached) return cached;
  } catch {}
  try {
    const data = await fetchFundNetWorth(code);
    await setCached(key, data, CACHE_TTL.FUND_NETWORTH);
    return data;
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
        const [transactions, netWorths] = await Promise.all([
          getTransactions(h.code),
          fetchNetWorthCached(h.code),
        ]);
        if (cancelled) break;
        result[h.code] = summarizeHolding(h, transactions, netWorths ?? []);
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
