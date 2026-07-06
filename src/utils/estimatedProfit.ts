// 今日预估收益计算工具
// 根据估算涨跌幅计算今日预估收益，并进行日期校验

/**
 * 计算今日预估收益
 * @param holdAmount 持有金额（市值）
 * @param estimatedChange 估算涨跌幅（百分比，如 -1.76）
 * @param estimatedTime 估算时间字符串 "YYYY-MM-DD HH:mm"
 * @returns 预估收益金额，null 表示不展示（休市或日期不对）
 *
 * 计算方式：预估收益 = holdAmount × estimatedChange / 100
 * 日期校验：estimatedTime 的日期部分必须等于今天才有效
 */
export function calcEstimatedProfit(
  holdAmount: number,
  estimatedChange: number,
  estimatedTime: string
): number | null {
  // 检查日期是否为今天
  const todayStr = new Date().toISOString().slice(0, 10);
  const estDate = estimatedTime.slice(0, 10);

  if (estDate !== todayStr) {
    // 估算日期不是今天，说明休市，不展示
    return null;
  }

  // 计算：持有金额 × 涨跌幅% / 100
  return holdAmount * estimatedChange / 100;
}

/**
 * 计算全部持仓的总预估收益
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