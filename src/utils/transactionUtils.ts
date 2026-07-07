import type { Transaction } from '@/types';

/** 判断交易是否为待净值确认状态（加仓无份额 或 减仓无金额） */
export function isPendingTx(tx: Transaction): boolean {
  return (tx.type === 'buy' && tx.shares === 0) || (tx.type === 'sell' && tx.amount === 0);
}
