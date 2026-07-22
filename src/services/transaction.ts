// 交易记录存储服务 - 管理买入/卖出流水 (Supabase 云端)
import type { Transaction } from '@/types';
import { getCache, removeCache } from '@/services/cache';
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

export async function getTransactions(fundCode?: string): Promise<Transaction[]> {
  const key = txCacheKey(fundCode);
  return getCache<Transaction[]>(key, TX_CACHE_TTL, () => cloudFetch(fundCode));
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
  removeCache(txCacheKey(record.fundCode));
  return newTransaction;
}

export async function removeTransaction(id: string, fundCode: string): Promise<void> {
  await removeTransactionCloud(id, fundCode);
  removeCache(txCacheKey(fundCode));
}

export async function updateTransaction(
  id: string,
  updates: Partial<Pick<Transaction, 'date' | 'amount' | 'shares' | 'fee' | 'note'>>,
  fundCode: string
): Promise<void> {
  await updateTransactionCloud(id, updates, fundCode);
  removeCache(txCacheKey(fundCode));
}

export async function removeByFund(fundCode: string): Promise<void> {
  await clearCloudTransactionsByFund(fundCode);
  removeCache(txCacheKey(fundCode));
}

/** 清除所有事务相关缓存（全量 + 各基金粒度），用于导入等不确定场景 */
export function clearAllTxCache(): void {
  removeCache(TX_CACHE_PREFIX);
  removeCache(TX_CACHE_PREFIX + ':');
}