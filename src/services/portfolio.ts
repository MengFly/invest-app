// 持仓存储服务 - 管理用户持仓列表与排序 (localStorage 持久化)
import type { Holding } from '@/types';

// 存储键
const HOLDINGS_KEY = 'portfolio:holdings';
const ORDER_KEY = 'portfolio:order';

/**
 * 读取全部持仓 (原始顺序, 按 addedAt 升序)
 * 解析失败或无数据返回空数组
 */
export async function getHoldings(): Promise<Holding[]> {
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
 * 读取排序数组 (codes), 未设置时返回空数组
 */
export async function getOrder(): Promise<string[]> {
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
  } catch {
    // 写入失败静默处理
  }
}

/**
 * 返回按排序后的持仓列表
 * 排序规则: 优先按 order 数组顺序, 未在 order 中的按 addedAt 升序补在后面
 */
export async function getOrderedHoldings(): Promise<Holding[]> {
  const holdings = await getHoldings();
  const order = await getOrder();

  // 按 order 顺序排列, 未在 order 中的按 addedAt 升序补后
  const ordered: Holding[] = [];
  const remaining = [...holdings];

  for (const code of order) {
    const idx = remaining.findIndex((h) => h.code === code);
    if (idx >= 0) {
      ordered.push(remaining[idx]);
      remaining.splice(idx, 1);
    }
  }
  // 剩余的按 addedAt 升序补后
  remaining.sort((a, b) => a.addedAt - b.addedAt);
  return [...ordered, ...remaining];
}

/**
 * 添加持仓 (创建空持仓, 份额/金额为 0 由聚合层推导)
 * @throws Error 当基金代码已存在时抛错 '基金已在持仓中'
 */
export async function addHolding(code: string, name: string): Promise<void> {
  const holdings = await getHoldings();
  if (holdings.some((h) => h.code === code)) {
    throw new Error('基金已在持仓中');
  }
  const newHolding: Holding = {
    code,
    name,
    addedAt: Date.now(),
  };
  const next = [...holdings, newHolding];
  try {
    localStorage.setItem(HOLDINGS_KEY, JSON.stringify(next));
  } catch (e) {
    throw new Error('保存持仓失败');
  }
}

/**
 * 删除持仓 (仅删持仓记录, 交易记录由 transaction.removeByFund 级联处理)
 */
export async function removeHolding(code: string): Promise<void> {
  const holdings = await getHoldings();
  const next = holdings.filter((h) => h.code !== code);
  try {
    localStorage.setItem(HOLDINGS_KEY, JSON.stringify(next));
    // 同步清理 order 数组中该 code
    const order = await getOrder();
    const nextOrder = order.filter((c) => c !== code);
    if (nextOrder.length !== order.length) {
      await writeOrder(nextOrder);
    }
  } catch {
    // 写入失败静默处理
  }
}

/**
 * 保存拖拽排序后的顺序 (导出 API)
 * @param codes 排序后的基金代码数组
 */
export async function saveOrder(codes: string[]): Promise<void> {
  await writeOrder(codes);
}
