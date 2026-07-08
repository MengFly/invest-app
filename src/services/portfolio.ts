// 持仓存储服务 - 管理用户持仓列表与排序 (Supabase 云端)
import type { Holding } from '@/types';
import {
  fetchHoldings,
  fetchOrder,
  addHolding as cloudAddHolding,
  removeHolding as cloudRemoveHolding,
  updateOrder,
} from '@/services/supabase';

/**
 * 读取全部持仓 (原始顺序, 按 addedAt 升序)
 */
export async function getHoldings(): Promise<Holding[]> {
  return await fetchHoldings();
}

/**
 * 读取排序数组 (codes)
 */
export async function getOrder(): Promise<string[]> {
  return await fetchOrder();
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
  const holdings = await getHoldings();
  if (holdings.some((h) => h.code === code)) {
    throw new Error('基金已在持仓中');
  }
  const newHolding: Holding = { code, name, addedAt: Date.now() };
  await cloudAddHolding(newHolding, holdings.length);
}

/**
 * 删除持仓
 */
export async function removeHolding(code: string): Promise<void> {
  await cloudRemoveHolding(code);
}

/**
 * 保存拖拽排序后的顺序
 */
export async function saveOrder(codes: string[]): Promise<void> {
  await updateOrder(codes);
}
