// 交易按日净值查询 + 费率计算工具
import type { NetWorthRecord, FundBasicInfo, Transaction } from '@/types';

/**
 * 从净值记录数组中查找指定日期的净值
 * 仅精确匹配交易日（非交易日返回 null）
 */
export function findNavByDate(
  netWorths: NetWorthRecord[],
  date: string
): NetWorthRecord | null {
  return netWorths.find((r) => r.date === date) ?? null;
}

/**
 * 查找某基金最早一笔买入交易的日期
 * 用于计算持有天数（首笔买入日到卖出日）
 */
export function getEarliestBuyDate(
  transactions: Transaction[],
  fundCode: string
): string | null {
  const buys = transactions
    .filter((t) => t.fundCode === fundCode && t.type === 'buy')
    .sort((a, b) => a.date.localeCompare(b.date));
  return buys.length > 0 ? buys[0].date : null;
}

/**
 * 计算两个日期之间的持有天数
 */
export function calcHoldDays(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return Math.floor((end - start) / (24 * 60 * 60 * 1000));
}

/**
 * 根据买入金额匹配买入费率
 * buyRules 按 minAmount/maxAmount 区间匹配
 * 金额越大费率越低（通常如此）
 */
export function calcBuyFeeRate(
  basicInfo: FundBasicInfo | null,
  amount: number
): number {
  if (!basicInfo || !basicInfo.buyRules || basicInfo.buyRules.length === 0) {
    return 0;
  }
  // 从大到小排序，优先匹配金额段
  const sorted = [...basicInfo.buyRules].sort(
    (a, b) => b.maxAmount - a.maxAmount
  );
  for (const rule of sorted) {
    if (amount >= rule.minAmount && amount <= rule.maxAmount) {
      return rule.value / 100; // 接口返回的是百分比数值，转为小数
    }
  }
  // 无匹配时取第一条规则
  return basicInfo.buyRules[0].value / 100;
}

/**
 * 根据持有天数匹配卖出费率
 * sellRules 按 dayStart/dayEnd 范围匹配（持有天数越长费率越低）
 * dayEnd 为 null 表示无上限（如 >7天免费）
 */
export function calcSellFeeRate(
  basicInfo: FundBasicInfo | null,
  holdDays: number
): number {
  if (!basicInfo || !basicInfo.sellRules || basicInfo.sellRules.length === 0) {
    return 0;
  }
  // 按 dayStart 升序排序
  const sorted = [...basicInfo.sellRules].sort(
    (a, b) => a.dayStart - b.dayStart
  );
  for (const rule of sorted) {
    if (rule.dayEnd === null && holdDays >= rule.dayStart) {
      return rule.value / 100;
    }
    if (rule.dayEnd !== null && holdDays >= rule.dayStart && holdDays <= rule.dayEnd) {
      return rule.value / 100;
    }
  }
  // 无匹配时取第一条规则
  return basicInfo.sellRules[0].value / 100;
}
