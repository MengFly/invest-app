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
  if (getStorageMode() === 'cloud') {
    try {
      return await cloudFetch(fundCode);
    } catch { /* fallback */ }
  }
  return fetchLocal(fundCode);
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
    return newTransaction;
  }

  const all = await fetchLocal();
  all.push(newTransaction);
  await writeLocal(all);
  return newTransaction;
}

export async function removeTransaction(id: string): Promise<void> {
  if (getStorageMode() === 'cloud') {
    await removeTransactionCloud(id);
    return;
  }

  const all = await fetchLocal();
  const next = all.filter((t) => t.id !== id);
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(next));
  } catch {}
}

export async function updateTransaction(
  id: string,
  updates: Partial<Pick<Transaction, 'date' | 'amount' | 'shares' | 'fee' | 'note'>>
): Promise<void> {
  if (getStorageMode() === 'cloud') {
    await updateTransactionCloud(id, updates);
    return;
  }

  const all = await fetchLocal();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error('交易记录不存在');
  all[idx] = { ...all[idx], ...updates };
  await writeLocal(all);
}

export async function removeByFund(fundCode: string): Promise<void> {
  if (getStorageMode() === 'cloud') {
    // Supabase 的删除持仓已级联删除交易记录
    return;
  }

  const all = await fetchLocal();
  const next = all.filter((t) => t.fundCode !== fundCode);
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(next));
  } catch {}
}
