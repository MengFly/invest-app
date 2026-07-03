// 交易记录存储服务 - 管理买入/卖出流水 (localStorage 持久化)
import type { Transaction } from '@/types';

// 存储键 (所有基金的交易记录集中存)
const TRANSACTIONS_KEY = 'portfolio:transactions';

/**
 * 读取交易记录
 * @param fundCode 可选, 指定时返回该基金的全部交易记录; 不指定返回全部
 * 返回按 createdAt 降序 (最新在前)
 * 解析失败或无数据返回空数组
 */
export async function getTransactions(fundCode?: string): Promise<Transaction[]> {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Transaction[];
    if (!Array.isArray(all)) return [];
    const filtered = fundCode ? all.filter((t) => t.fundCode === fundCode) : all;
    // 按 createdAt 降序 (最新在前)
    return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/**
 * 新增交易记录
 * 自动生成 id (createdAt + 随机后缀) 与 createdAt
 * @returns 完整的 Transaction 对象 (含生成的 id/createdAt)
 */
export async function addTransaction(
  record: Omit<Transaction, 'id' | 'createdAt'>
): Promise<Transaction> {
  const all = await getTransactionsRaw();
  const now = Date.now();
  const newTransaction: Transaction = {
    ...record,
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
  };
  const next = [...all, newTransaction];
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(next));
  } catch (e) {
    throw new Error('保存交易记录失败');
  }
  return newTransaction;
}

/**
 * 删除单条交易记录
 */
export async function removeTransaction(id: string): Promise<void> {
  const all = await getTransactionsRaw();
  const next = all.filter((t) => t.id !== id);
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(next));
  } catch {
    // 删除失败静默处理
  }
}

/**
 * 更新单条交易记录
 */
export async function updateTransaction(
  id: string,
  updates: Partial<Pick<Transaction, 'date' | 'amount' | 'shares' | 'fee' | 'note'>>
): Promise<void> {
  const all = await getTransactionsRaw();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error('交易记录不存在');
  all[idx] = { ...all[idx], ...updates };
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(all));
  } catch {
    throw new Error('保存交易记录失败');
  }
}

/**
 * 按基金删除全部交易记录 (删除持仓时级联调用)
 */
export async function removeByFund(fundCode: string): Promise<void> {
  const all = await getTransactionsRaw();
  const next = all.filter((t) => t.fundCode !== fundCode);
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(next));
  } catch {
    // 删除失败静默处理
  }
}

/**
 * 读取全部交易记录 (原始顺序, 不过滤不排序, 供内部写入时使用)
 */
async function getTransactionsRaw(): Promise<Transaction[]> {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Transaction[];
    return Array.isArray(all) ? all : [];
  } catch {
    return [];
  }
}
