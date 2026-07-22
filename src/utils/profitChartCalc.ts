import type { NetWorthRecord, Transaction } from '@/types';

function formatMoney(v: number): string {
  return `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calcDailyProfitData(netWorths: NetWorthRecord[], transactions: Transaction[]) {
  const sortedTxns = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  let cumShares = 0;
  let cumInvested = 0;
  let txnIdx = 0;
  const dailyProfits: number[] = [];

  for (const rec of netWorths) {
    while (txnIdx < sortedTxns.length && sortedTxns[txnIdx].date <= rec.date) {
      const t = sortedTxns[txnIdx];
      if (t.type === 'buy') {
        cumShares += t.shares;
        cumInvested += t.amount;
      } else if (t.type === 'sell') {
        cumShares -= t.shares;
        cumInvested -= t.amount;
      }
      // dividend: 不影响份额和投入
      txnIdx++;
    }
    const profit = cumShares * rec.netWorth - cumInvested;
    dailyProfits.push(profit);
  }
  return dailyProfits;
}

function calcHoldingProfitData(netWorths: NetWorthRecord[], transactions: Transaction[]): number[] {
  const sortedTxns = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  let cumShares = 0;
  let cumInvested = 0;
  let totalBuyCost = 0;
  let totalBuyShares = 0;
  let txnIdx = 0;
  const holdingProfits: number[] = [];

  for (const rec of netWorths) {
    while (txnIdx < sortedTxns.length && sortedTxns[txnIdx].date <= rec.date) {
      const t = sortedTxns[txnIdx];
      if (t.type === 'buy') {
        cumShares += t.shares;
        cumInvested += t.amount;
        totalBuyCost += t.amount;
        totalBuyShares += t.shares;
      } else if (t.type === 'sell') {
        cumShares -= t.shares;
        cumInvested -= t.amount;
      }
      // dividend: 不影响份额和投入
      txnIdx++;
    }
    const avgCost = totalBuyShares > 0 ? totalBuyCost / totalBuyShares : 0;
    holdingProfits.push(cumShares * rec.netWorth - cumShares * avgCost);
  }
  return holdingProfits;
}

export interface DailyProfitResult {
  profits: number[];
  holdingProfits: number[];
  xLabels: string[];
  endLabel: string;
}

export function calcDailyProfits(
  netWorths: NetWorthRecord[],
  transactions: Transaction[]
): DailyProfitResult | null {
  if (netWorths.length === 0) return null;

  const profits = calcDailyProfitData(netWorths, transactions);
  const holdingProfits = calcHoldingProfitData(netWorths, transactions);

  return {
    profits,
    holdingProfits,
    xLabels: netWorths.map((r) => r.date),
    endLabel: profits[profits.length - 1] >= 0
      ? `+${formatMoney(profits[profits.length - 1])}`
      : formatMoney(profits[profits.length - 1]),
  };
}