export function formatMoney(value: number, showSign = false): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (value < 0) return `-¥${formatted}`;
  if (showSign && value > 0) return `+¥${formatted}`;
  return `¥${formatted}`;
}

export function formatPercent(value: number, digits = 2): string {
  const pct = (value * 100).toFixed(digits);
  if (value > 0) return `+${pct}%`;
  if (value < 0) return `${pct}%`;
  return `0.00%`;
}
