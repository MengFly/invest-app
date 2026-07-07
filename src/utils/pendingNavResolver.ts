import type { NetWorthRecord, Transaction } from '@/types';
import { getTransactions, updateTransaction } from '@/services/transaction';
import { findNavByDate } from '@/utils/navUtils';

/**
 * 使用已有的净值数据补全待确认交易。
 * 判断依据：
 *  - 加仓 shares === 0 → 待补份额
 *  - 减仓 amount === 0 → 待补金额
 */
export async function resolveWithNetWorths(
  fundCode: string,
  netWorths: NetWorthRecord[]
): Promise<number> {
  const all = await getTransactions(fundCode);
  const pending = all.filter((t) =>
    (t.type === 'buy' && t.shares === 0) ||
    (t.type === 'sell' && t.amount === 0)
  );
  if (pending.length === 0) return 0;

  let resolvedCount = 0;
  for (const tx of pending) {
    const navRec = findNavByDate(netWorths, tx.date);
    if (!navRec || navRec.netWorth <= 0) continue;

    const nav = navRec.netWorth;
    const updates: Partial<Pick<Transaction, 'shares' | 'amount' | 'fee'>> = {};

    if (tx.type === 'buy') {
      updates.shares = tx.amount / nav;
      updates.fee = 0;
    } else if (tx.type === 'sell') {
      updates.amount = tx.shares * nav;
      updates.fee = 0;
    } else {
      continue;
    }

    await updateTransaction(tx.id, updates);
    resolvedCount++;
  }

  return resolvedCount;
}
