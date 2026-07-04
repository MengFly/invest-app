import type { NetWorthRecord, Transaction } from '@/types';

function formatMoney(v: number): string {
  return `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toYLabels(min: number, max: number): string[] {
  const range = max - min || 1;
  const steps = 4;
  const rawStep = range / steps;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep) || 1)));
  const niceStep = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]
    .find((n) => n * magnitude >= rawStep) ?? magnitude * Math.ceil(rawStep / magnitude);
  const start = Math.floor(min / niceStep) * niceStep;
  const labels: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const v = start + i * niceStep;
    labels.push(v >= 0 ? `+${v}` : `${v}`);
  }
  if (labels.length < 2) {
    labels.push('0');
  }
  return labels;
}

function toXLabels(netWorths: NetWorthRecord[]): string[] {
  if (netWorths.length <= 1) return netWorths.map((r) => r.date.slice(5));
  const count = Math.min(5, netWorths.length);
  const step = (netWorths.length - 1) / (count - 1);
  const labels: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round(i * step);
    labels.push(netWorths[idx].date.slice(5));
  }
  return labels;
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
      } else {
        cumShares -= t.shares;
        cumInvested -= t.amount;
      }
      txnIdx++;
    }
    const profit = cumShares * rec.netWorth - cumInvested;
    dailyProfits.push(profit);
  }
  return dailyProfits;
}

function profitToV(profit: number, min: number, max: number): number {
  const range = max - min || 1;
  return 130 - ((profit - min) / range) * 120 + 10;
}

export interface DailyProfitResult {
  points: number[];
  dataRange: { min: number; max: number };
  yLabels: string[];
  xLabels: string[];
  endLabel: string;
  holdingPoints: number[];
  holdingDataRange: { min: number; max: number };
}

export function calcDailyProfits(
  netWorths: NetWorthRecord[],
  transactions: Transaction[]
): DailyProfitResult | null {
  if (netWorths.length === 0) return null;

  const profits = calcDailyProfitData(netWorths, transactions);
  const min = Math.min(...profits);
  const max = Math.max(...profits);
  const points = profits.map((p) => profitToV(p, min, max));

  // 计算持仓收益（未实现）：持有市值 - 加权平均买入成本
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
      } else {
        cumShares -= t.shares;
        cumInvested -= t.amount;
      }
      txnIdx++;
    }
    const avgCost = totalBuyShares > 0 ? totalBuyCost / totalBuyShares : 0;
    holdingProfits.push(cumShares * rec.netWorth - cumShares * avgCost);
  }

  const holdingMin = Math.min(...holdingProfits);
  const holdingMax = Math.max(...holdingProfits);
  const holdingPoints = holdingProfits.map((p) => profitToV(p, holdingMin, holdingMax));

  return {
    points,
    dataRange: { min, max },
    holdingPoints,
    holdingDataRange: { min: holdingMin, max: holdingMax },
    yLabels: toYLabels(min, max),
    xLabels: toXLabels(netWorths),
    endLabel: profits[profits.length - 1] >= 0
      ? `+${formatMoney(profits[profits.length - 1])}`
      : formatMoney(profits[profits.length - 1]),
  };
}
