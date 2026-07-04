// 交易记录存储服务 - 管理买入/卖出流水 (localStorage 持久化 / Supabase 云端)
import type { Transaction } from '@/types';
import {
  getStorageMode,
  fetchTransactions as cloudFetch,
  addTransaction as cloudAdd,
  updateTransactionCloud,
  removeTransactionCloud,
} from '@/services/supabase';

const TRANSACTIONS_KEY = 'portfolio:transactions';

// localStorage 缓存键（独立于 cloud cache，确保所有模式都生效）
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

/** 清除所有事务相关缓存（全量 + 各基金粒度） */
function clearAllTxCache(): void {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k === TX_CACHE_PREFIX || k?.startsWith(TX_CACHE_PREFIX + ':')) {
      localStorage.removeItem(k);
    }
  }
}

async function fetchLocal(fundCode?: string): Promise<Transaction[]> {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Transaction[];
    if (!Array.isArray(all)) return [];
    const filtered = fundCode ? all.filter((t) => t.fundCode === fundCode) : all;
    return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

async function writeLocal(all: Transaction[]): Promise<void> {
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(all));
  } catch (e) {
    throw new Error('保存交易记录失败');
  }
}

export async function getTransactions(fundCode?: string): Promise<Transaction[]> {
  // 优先读缓存（全量或基金粒度）
  const cached = readTxCache(fundCode);
  if (cached) return cached;

  let result: Transaction[];

  if (getStorageMode() === 'cloud') {
    try {
      result = await cloudFetch(fundCode);
    } catch {
      result = await fetchLocal(fundCode);
    }
  } else {
    result = await fetchLocal(fundCode);
  }

  writeTxCache(result, fundCode);
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

  if (getStorageMode() === 'cloud') {
    await cloudAdd(newTransaction);
    clearAllTxCache(); // 清除缓存
    return newTransaction;
  }

  const all = await fetchLocal();
  all.push(newTransaction);
  await writeLocal(all);
  clearAllTxCache(); // 清除缓存
  return newTransaction;
}

export async function removeTransaction(id: string): Promise<void> {
  if (getStorageMode() === 'cloud') {
    await removeTransactionCloud(id);
    clearAllTxCache();
    return;
  }

  const all = await fetchLocal();
  const next = all.filter((t) => t.id !== id);
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(next));
    clearAllTxCache();
  } catch {}
}

export async function updateTransaction(
  id: string,
  updates: Partial<Pick<Transaction, 'date' | 'amount' | 'shares' | 'fee' | 'note'>>
): Promise<void> {
  if (getStorageMode() === 'cloud') {
    await updateTransactionCloud(id, updates);
    clearAllTxCache();
    return;
  }

  const all = await fetchLocal();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error('交易记录不存在');
  all[idx] = { ...all[idx], ...updates };
  await writeLocal(all);
  clearAllTxCache();
}

export async function removeByFund(fundCode: string): Promise<void> {
  if (getStorageMode() === 'cloud') {
    clearAllTxCache();
    return;
  }

  const all = await fetchLocal();
  const next = all.filter((t) => t.fundCode !== fundCode);
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(next));
    clearAllTxCache();
  } catch {}
}
