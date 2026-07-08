import { isPendingTx } from '@/utils/transactionUtils';
import type { Holding, Transaction, NetWorthRecord, HoldingSummary } from '@/types';

/**
 * 聚合计算持仓摘要
 * @param annualMgmtFeeRate 年化管理费率（小数，如 0.015 表示 1.5%），不传则不计算管理费
 */
export function summarizeHolding(
  holding: Holding,
  transactions: Transaction[],
  netWorths: NetWorthRecord[] | null | undefined,
  annualMgmtFeeRate?: number
): HoldingSummary {
  let holdShares = 0;
  let totalInvested = 0;
  let totalBuyCost = 0;
  let totalBuyShares = 0;
  let totalDividend = 0;
  for (const t of transactions) {
    if (isPendingTx(t)) continue;
    if (t.type === 'buy') {
      holdShares += t.shares;
      totalInvested += t.amount;
      totalBuyCost += t.amount;
      totalBuyShares += t.shares;
    } else if (t.type === 'sell') {
      holdShares -= t.shares;
      totalInvested -= t.amount;
    } else if (t.type === 'dividend') {
      totalDividend += t.amount;
    }
  }

  const latestRecord = netWorths && netWorths.length > 0 ? netWorths[netWorths.length - 1] : null;
  const prevRecord = netWorths && netWorths.length > 1 ? netWorths[netWorths.length - 2] : null;
  const latestNav = latestRecord ? latestRecord.netWorth : 0;
  const navDate = latestRecord ? latestRecord.date : '';
  const todayChange = latestRecord ? latestRecord.netWorthChange / 100 : 0;
  const prevNav = prevRecord ? prevRecord.netWorth : latestNav;

  const holdAmount = holdShares * latestNav;
  const totalProfit = holdAmount - totalInvested + totalDividend - totalManagementFee;
  const totalProfitRate = totalInvested > 0 ? totalProfit / totalInvested : 0;

  // 管理费计算
  let totalManagementFee = 0;
  if (annualMgmtFeeRate && annualMgmtFeeRate > 0 && holdAmount > 0) {
    let holdDays = 0;
    const buyTxns = transactions.filter((t) => t.type === 'buy');
    if (buyTxns.length > 0) {
      const firstDate = buyTxns.reduce((earliest, t) => (t.date < earliest ? t.date : earliest), buyTxns[0].date);
      const firstTime = new Date(firstDate).getTime();
      if (!isNaN(firstTime)) {
        holdDays = Math.floor((Date.now() - firstTime) / (24 * 60 * 60 * 1000));
        if (holdDays < 0) holdDays = 0;
      }
    }
    totalManagementFee = holdAmount * annualMgmtFeeRate / 365 * holdDays;
  }

  // 持仓收益（未实现）：持有市值 - 加权平均买入成本
  const avgCostPerShare = totalBuyShares > 0 ? totalBuyCost / totalBuyShares : 0;
  const holdingCostBasis = avgCostPerShare * holdShares;
  const holdingProfit = holdAmount - holdingCostBasis;
  const holdingProfitRate = holdingCostBasis > 0 ? holdingProfit / holdingCostBasis : 0;

  const todayProfit = holdShares * prevNav * todayChange;

  let holdDays = 0;
  if (transactions.length > 0) {
    const buyTxns = transactions.filter((t) => t.type === 'buy');
    if (buyTxns.length > 0) {
      const firstDate = buyTxns.reduce((earliest, t) => (t.date < earliest ? t.date : earliest), buyTxns[0].date);
      const firstTime = new Date(firstDate).getTime();
      if (!isNaN(firstTime)) {
        holdDays = Math.floor((Date.now() - firstTime) / (24 * 60 * 60 * 1000));
        if (holdDays < 0) holdDays = 0;
      }
    }
  }

  let sparkline: number[] = [];
  let sparklineUp = false;
  if (netWorths && netWorths.length >= 2) {
    sparkline = netWorths.slice(-9).map((r) => r.netWorth);
    sparklineUp = sparkline[sparkline.length - 1] >= sparkline[0];
  }

  return {
    holding,
    holdShares,
    totalInvested,
    holdAmount,
    totalProfit,
    totalProfitRate,
    todayChange,
    todayProfit,
    holdDays,
    latestNav,
    navDate,
    sparkline,
    sparklineUp,
    // 持仓收益
    holdingProfit,
    holdingProfitRate,
    // 买入统计
    totalBuyCost,
    totalBuyShares,
    // 分红
    totalDividend,
    // 管理费
    totalManagementFee,
  };
}