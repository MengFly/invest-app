// 持仓存储服务 - 管理用户持仓列表与排序 (localStorage 持久化 / Supabase 云端)
import type { Holding } from '@/types';
import { getStorageMode, fetchHoldings, fetchOrder, addHolding as cloudAddHolding, removeHolding as cloudRemoveHolding, updateOrder } from '@/services/supabase';

// 存储键
const HOLDINGS_KEY = 'portfolio:holdings';
const ORDER_KEY = 'portfolio:order';

/**
 * 读取全部持仓 (原始顺序, 按 addedAt 升序)
 */
export async function getHoldings(): Promise<Holding[]> {
  if (getStorageMode() === 'cloud') {
    try {
      return await fetchHoldings();
    } catch { /* fallback to local */ }
  }
  try {
    const raw = localStorage.getItem(HOLDINGS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Holding[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * 读取排序数组 (codes)
 */
export async function getOrder(): Promise<string[]> {
  if (getStorageMode() === 'cloud') {
    try {
      return await fetchOrder();
    } catch { /* fallback */ }
  }
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (!raw) return [];
    const order = JSON.parse(raw) as string[];
    return Array.isArray(order) ? order : [];
  } catch {
    return [];
  }
}

/**
 * 保存排序数组 (内部写入)
 */
async function writeOrder(codes: string[]): Promise<void> {
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify(codes));
  } catch {}
}

/**
 * 返回按排序后的持仓列表
 */
export async function getOrderedHoldings(): Promise<Holding[]> {
  const holdings = await getHoldings();
  const order = await getOrder();

  const ordered: Holding[] = [];
  const remaining = [...holdings];

  for (const code of order) {
    const idx = remaining.findIndex((h) => h.code === code);
    if (idx >= 0) {
      ordered.push(remaining[idx]);
      remaining.splice(idx, 1);
    }
  }
  remaining.sort((a, b) => a.addedAt - b.addedAt);
  return [...ordered, ...remaining];
}

/**
 * 添加持仓
 */
export async function addHolding(code: string, name: string): Promise<void> {
  if (getStorageMode() === 'cloud') {
    const holdings = await getHoldings();
    if (holdings.some((h) => h.code === code)) {
      throw new Error('基金已在持仓中');
    }
    const newHolding: Holding = { code, name, addedAt: Date.now() };
    await cloudAddHolding(newHolding, holdings.length);
    return;
  }

  const holdings = await getHoldings();
  if (holdings.some((h) => h.code === code)) {
    throw new Error('基金已在持仓中');
  }
  const newHolding: Holding = { code, name, addedAt: Date.now() };
  const next = [...holdings, newHolding];
  try {
    localStorage.setItem(HOLDINGS_KEY, JSON.stringify(next));
  } catch (e) {
    throw new Error('保存持仓失败');
  }
}

/**
 * 删除持仓
 */
export async function removeHolding(code: string): Promise<void> {
  if (getStorageMode() === 'cloud') {
    await cloudRemoveHolding(code);
    return;
  }

  const holdings = await getHoldings();
  const next = holdings.filter((h) => h.code !== code);
  try {
    localStorage.setItem(HOLDINGS_KEY, JSON.stringify(next));
    const order = await getOrder();
    const nextOrder = order.filter((c) => c !== code);
    if (nextOrder.length !== order.length) {
      await writeOrder(nextOrder);
    }
  } catch {}
}

/**
 * 保存拖拽排序后的顺序
 */
export async function saveOrder(codes: string[]): Promise<void> {
  if (getStorageMode() === 'cloud') {
    await updateOrder(codes);
    return;
  }
  await writeOrder(codes);
}
