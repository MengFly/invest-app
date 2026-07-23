import type { EstimatedNavData, NetWorthRecord, Transaction } from '@/types';
import { findNavByDate } from '@/utils/navUtils';

/** 判断交易是否为待净值确认状态（加仓无份额 或 减仓无金额） */
export function isPendingTx(tx: Transaction): boolean {
  return (tx.type === 'buy' && tx.shares === 0) || (tx.type === 'sell' && tx.amount === 0);
}

/**
 * 获取上次指定类型交易距今天数
 * @returns { days: 天数, date: 交易日期 } | null（无交易时返回 null）
 */
export function getLastTxDays(
  txType: 'buy' | 'sell',
  transactions: Transaction[]
): { days: number; date: string } | null {
  const filtered = transactions.filter((t) => t.type === txType);
  if (filtered.length === 0) return null;
  // 按日期降序取最新一条
  const lastTx = [...filtered].sort((a, b) => b.date.localeCompare(a.date))[0];
  const now = new Date();
  const txDate = new Date(lastTx.date + 'T00:00:00');
  const diffMs = now.getTime() - txDate.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return { days, date: lastTx.date };
}

/**
 * 计算从指定交易日至今的净值涨跌幅
 * 公式：(latestNav - txNav) / latestNav
 * @param txDate 交易日日期（YYYY-MM-DD）
 * @param netWorths 净值记录数组
 * @param estimatedNavData 估算净值（优先作为最新净值）
 * @returns { change: 涨跌幅(小数), txNav: 操作日净值, latestNav: 最新净值 } | null
 */
export function getNavChangeSince(
  txDate: string,
  netWorths: NetWorthRecord[],
  estimatedNavData?: EstimatedNavData | null
): { change: number; txNav: number; latestNav: number } | null {
  // 找到交易日的净值
  const txNavRecord = findNavByDate(netWorths, txDate);
  if (!txNavRecord) return null;
  const txNav = txNavRecord.netWorth;

  // 获取最新净值（优先使用估算净值）
  let latestNav: number;
  if (estimatedNavData && estimatedNavData.estimatedNav) {
    latestNav = estimatedNavData.estimatedNav;
  } else if (netWorths.length > 0) {
    latestNav = netWorths[netWorths.length - 1].netWorth;
  } else {
    return null;
  }

  // (latestNav - txNav) / latestNav
  const change = (latestNav - txNav) / latestNav;
  return { change, txNav, latestNav };
}
