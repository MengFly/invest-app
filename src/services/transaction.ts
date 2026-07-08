// 交易记录存储服务 - 管理买入/卖出流水 (Supabase 云端)
import type { Transaction } from '@/types';
import {
  fetchTransactions as cloudFetch,
  addTransaction as cloudAdd,
  updateTransactionCloud,
  removeTransactionCloud,
  clearCloudTransactionsByFund,
} from '@/services/supabase';

// localStorage 缓存键（独立于 cloud cache，减少重复请求）
const TX_CACHE_PREFIX = 'cache:transactions';
const TX_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 小时

/** 生成事务缓存键：无 fundCode 为全量缓存，有则为基金粒度缓存 */
function txCacheKey(fundCode?: string): string {
  return fundCode ? `${TX_CACHE_PREFIX}:${fundCode}` : TX_CACHE_PREFIX;
}

/** 读取缓存，过期或不存在返回 null */
function readTxCache(fundCode?: string): Transaction[] | null {
  try {
    const key = txCacheKey(fundCode);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts > TX_CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data as Transaction[];
  } catch { return null; }
}

/** 写入缓存 */
function writeTxCache(data: Transaction[], fundCode?: string): void {
  try {
    localStorage.setItem(txCacheKey(fundCode), JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

/** 定向清除某基金的交易缓存，不清除其他基金的缓存 */
function clearTxCache(fundCode: string): void {
  try {
    localStorage.removeItem(txCacheKey(fundCode));
  } catch {}
}

/** 清除所有事务相关缓存（全量 + 各基金粒度），用于导入等不确定场景 */
export function clearAllTxCache(): void {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k === TX_CACHE_PREFIX || k?.startsWith(TX_CACHE_PREFIX + ':')) {
      localStorage.removeItem(k);
    }
  }
}

export async function getTransactions(fundCode?: string): Promise<Transaction[]> {
  // 优先读缓存
  const cached = readTxCache(fundCode);
  if (cached) return cached;

  const result = await cloudFetch(fundCode);
  if (fundCode) {
    writeTxCache(result, fundCode);
  }
  return result;
}

export async function addTransaction(
  record: Omit<Transaction, 'id' | 'createdAt'>
): Promise<Transaction> {
  const now = Date.now();
  const newTransaction: Transaction = {
    ...record,
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
  };

  await cloudAdd(newTransaction);
  clearTxCache(record.fundCode);
  return newTransaction;
}

export async function removeTransaction(id: string, fundCode: string): Promise<void> {
  await removeTransactionCloud(id, fundCode);
  clearTxCache(fundCode);
}

export async function updateTransaction(
  id: string,
  updates: Partial<Pick<Transaction, 'date' | 'amount' | 'shares' | 'fee' | 'note'>>,
  fundCode: string
): Promise<void> {
  await updateTransactionCloud(id, updates, fundCode);
  clearTxCache(fundCode);
}

export async function removeByFund(fundCode: string): Promise<void> {
  await clearCloudTransactionsByFund(fundCode);
  clearTxCache(fundCode);
}
