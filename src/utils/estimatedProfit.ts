/**
 * 预估收益计算工具
 * 根据估算净值数据计算今日预估收益
 */

/**
 * 计算单只基金的今日预估收益
 * @param holdAmount 持有金额
 * @param estimatedChange 估算涨跌幅（百分比数值，如 1.23 表示 +1.23%）
 * @param estimatedTime 估算时间
 * @returns 预估收益金额，若非交易日返回 null
 */
export function calcEstimatedProfit(
  holdAmount: number,
  estimatedChange: number,
  estimatedTime: string
): number | null {
  const todayStr = new Date().toISOString().slice(0, 10);
  const estDate = estimatedTime.slice(0, 10);
  if (estDate !== todayStr) return null;
  return holdAmount * estimatedChange / 100;
}

/**
 * 计算全部基金的总预估收益
 * @param items 每只基金的持有金额、估算涨跌幅、估算时间
 * @returns 总预估收益，若全部非交易日返回 null
 */
export function calcTotalEstimatedProfit(
  items: Array<{ holdAmount: number; estimatedChange: number; estimatedTime: string }>
): number | null {
  let total = 0;
  let hasValid = false;
  for (const item of items) {
    const ep = calcEstimatedProfit(item.holdAmount, item.estimatedChange, item.estimatedTime);
    if (ep !== null) {
      total += ep;
      hasValid = true;
    }
  }
  return hasValid ? total : null;
}