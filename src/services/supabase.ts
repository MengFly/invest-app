// Supabase 云存储服务 - 管理持仓与交易记录的云端持久化
import { createClient } from '@supabase/supabase-js';
import type { Holding, Transaction } from '@/types';

// localStorage 存储键
const CONFIG_KEY = 'supabase:config';
const MODE_KEY = 'storage:mode';

export interface SupabaseConfig {
  url: string;
  key: string;
}

export type StorageMode = 'local' | 'cloud';

/**
 * 获取存储的 Supabase 配置
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SupabaseConfig;
  } catch {
    return null;
  }
}

/**
 * 保存 Supabase 配置到 localStorage
 */
export function saveSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

/**
 * 清除 Supabase 配置
 */
export function clearSupabaseConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
}

/**
 * 获取当前存储模式
 */
export function getStorageMode(): StorageMode {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    if (raw === 'cloud' || raw === 'local') return raw;
  } catch {}
  return 'local';
}

/**
 * 设置存储模式
 */
export function setStorageMode(mode: StorageMode): void {
  localStorage.setItem(MODE_KEY, mode);
}

/**
 * 合并本地数据到云端（本地覆盖云端同名记录，云端独有保留）
 */
export async function syncLocalToCloud(): Promise<void> {
  // 动态导入本地服务以避免循环依赖
  const { getHoldings, getOrder } = await import('./portfolio');
  const { getTransactions } = await import('./transaction');

  const localHoldings = await getHoldings();
  const localOrder = await getOrder();
  const localTransactions = await getTransactions();

  const cloudTransactions = await fetchTransactions();

  // 合并 holdings：以 code 为 key，本地覆盖云端
  const mergedHoldings = new Map<string, { code: string; name: string; addedAt: number; order: number }>();
  // 先加入云端数据
  const cloudOrderMap = new Map<string, number>();
  const { client } = createClientFromConfig();
  if (!client) throw new Error('Supabase 未配置');
  const { data: cloudData } = await client.from('fund_holdings').select('*');
  for (const h of (cloudData ?? [])) {
    mergedHoldings.set(h.code, h);
    cloudOrderMap.set(h.code, h.order ?? 999);
  }
  // 本地覆盖
  let nextOrder = Math.max(0, ...Array.from(cloudOrderMap.values())) + 1;
  for (const h of localHoldings) {
    const existingOrder = cloudOrderMap.get(h.code);
    mergedHoldings.set(h.code, {
      code: h.code,
      name: h.name,
      addedAt: h.addedAt,
      order: existingOrder ?? nextOrder++,
    });
  }
  // 应用本地排序
  if (localOrder.length > 0) {
    localOrder.forEach((code, idx) => {
      const existing = mergedHoldings.get(code);
      if (existing) {
        mergedHoldings.set(code, { ...existing, order: idx });
      }
    });
  }

  // 批量 upsert holdings
  const holdingsArray = Array.from(mergedHoldings.values());
  if (holdingsArray.length > 0) {
    const { error: upsertErr } = await client.from('fund_holdings').upsert(holdingsArray, { onConflict: 'code' });
    if (upsertErr) throw new Error(upsertErr.message);
  }

  // 合并 transactions：以 id 为 key，本地覆盖云端
  const mergedTxs = new Map<string, any>();
  for (const tx of cloudTransactions) {
    mergedTxs.set(tx.id, tx);
  }
  for (const tx of localTransactions) {
    mergedTxs.set(tx.id, tx);
  }

  // 批量 upsert transactions
  const txsArray = Array.from(mergedTxs.values());
  if (txsArray.length > 0) {
    const { error: txErr } = await client.from('fund_transactions').upsert(txsArray, { onConflict: 'id' });
    if (txErr) throw new Error(txErr.message);
  }
}

/**
 * 测试 Supabase 连接有效性
 */
export async function testConnection(config: SupabaseConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createClient(config.url, config.key, { auth: { persistSession: false } });
    const { error } = await supabase.from('fund_holdings').select('code', { count: 'exact', head: true });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '连接失败' };
  }
}

/**
 * 创建 Supabase 客户端实例（使用已存储的配置）
 */
function createClientFromConfig(): { client: any; error?: string } {
  const config = getSupabaseConfig();
  if (!config) return { client: null, error: '未配置 Supabase 连接信息' };
  try {
    const client = createClient(config.url, config.key, { auth: { persistSession: false } });
    return { client };
  } catch (e) {
    return { client: null, error: e instanceof Error ? e.message : '创建客户端失败' };
  }
}

// ==================== 缓存辅助 ====================

const CACHE_PREFIX = 'supabase:cache:';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 小时（仅在写入操作时清除缓存）

function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data as T;
  } catch { return null; }
}

function setCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

function clearCache(key?: string): void {
  if (key) {
    // 清除精确匹配和带次级前缀的（如 transactions 也清除 transactions:005827）
    const prefix = CACHE_PREFIX + key;
    const colonPrefix = prefix + ':';
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k === prefix || k?.startsWith(colonPrefix)) {
        localStorage.removeItem(k);
      }
    }
  } else {
    // 清除所有云缓存
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(CACHE_PREFIX)) localStorage.removeItem(k);
    }
  }
}

// ==================== fund_holdings CRUD ====================

/**
 * 读取全部持仓（按 order 升序）
 */
export async function fetchHoldings(): Promise<Holding[]> {
  const cached = getCache<Holding[]>('holdings');
  if (cached) return cached;

  const { client, error } = createClientFromConfig();
  if (!client) throw new Error(error);
  const { data, error: err } = await client
    .from('fund_holdings')
    .select('*')
    .order('order', { ascending: true });
  if (err) throw new Error(err.message);
  const result = (data ?? []).map((r: any) => ({
    code: r.code,
    name: r.name,
    addedAt: r.addedAt ?? 0,
  }));
  setCache('holdings', result);
  return result;
}

/**
 * 读取持仓排序（code 列表）
 */
export async function fetchOrder(): Promise<string[]> {
  const cached = getCache<string[]>('order');
  if (cached) return cached;

  const { client, error } = createClientFromConfig();
  if (!client) throw new Error(error);
  const { data, error: err } = await client
    .from('fund_holdings')
    .select('code, order')
    .order('order', { ascending: true });
  if (err) throw new Error(err.message);
  const result = (data ?? []).map((r: any) => r.code);
  setCache('order', result);
  return result;
}

/**
 * 添加持仓
 */
export async function addHolding(holding: Holding, sortOrder: number): Promise<void> {
  const { client, error } = createClientFromConfig();
  if (!client) throw new Error(error);
  const { error: err } = await client
    .from('fund_holdings')
    .insert({ code: holding.code, name: holding.name, addedAt: holding.addedAt, order: sortOrder });
  if (err) throw new Error(err.message);
  clearCache('holdings');
  clearCache('order');
}

/**
 * 删除持仓（级联删除交易记录）
 */
export async function removeHolding(code: string): Promise<void> {
  const { client, error } = createClientFromConfig();
  if (!client) throw new Error(error);
  try {
    // 先删交易记录
    await client.from('fund_transactions').delete().eq('fundCode', code);
    // 再删持仓
    const { error: err } = await client.from('fund_holdings').delete().eq('code', code);
    if (err) throw new Error(err.message);
  } finally {
    clearCache('holdings');
    clearCache('transactions');
    clearCache('order');
  }
}

/**
 * 更新持仓排序
 */
export async function updateOrder(orderedCodes: string[]): Promise<void> {
  const { client, error } = createClientFromConfig();
  if (!client) throw new Error(error);
  const updates = orderedCodes.map((code, index) => ({
    code,
    order: index,
  }));
  // 逐个更新（Supabase 不支持批量 upsert 时指定唯一冲突）
  for (const u of updates) {
    await client.from('fund_holdings').update({ order: u.order }).eq('code', u.code);
  }
  clearCache('holdings');
  clearCache('order');
}

// ==================== fund_transactions CRUD ====================

/**
 * 读取全部交易记录（按 createdAt 降序）
 */
export async function fetchTransactions(fundCode?: string): Promise<Transaction[]> {
  const cacheKey = 'transactions' + (fundCode ? `:${fundCode}` : '');
  const cached = getCache<Transaction[]>(cacheKey);
  if (cached) return cached;

  const { client, error } = createClientFromConfig();
  if (!client) throw new Error(error);
  let query = client.from('fund_transactions').select('*').order('createdAt', { ascending: false });
  if (fundCode) {
    query = query.eq('fundCode', fundCode);
  }
  const { data, error: err } = await query;
  if (err) throw new Error(err.message);
  const result = (data ?? []).map((r: any) => ({
    id: r.id,
    fundCode: r.fundCode,
    type: r.type,
    date: r.date,
    amount: r.amount,
    shares: r.shares,
    fee: r.fee ?? 0,
    note: r.note ?? undefined,
    createdAt: r.createdAt,
  }));
  setCache(cacheKey, result);
  return result;
}

/**
 * 新增交易记录
 */
export async function addTransaction(tx: Transaction): Promise<void> {
  const { client, error } = createClientFromConfig();
  if (!client) throw new Error(error);
  const { error: err } = await client.from('fund_transactions').insert(tx);
  if (err) throw new Error(err.message);
  clearCache('transactions');
}

/**
 * 更新交易记录
 */
export async function updateTransactionCloud(
  id: string,
  updates: Partial<Pick<Transaction, 'date' | 'amount' | 'shares' | 'fee' | 'note'>>
): Promise<void> {
  const { client, error } = createClientFromConfig();
  if (!client) throw new Error(error);
  const { error: err } = await client.from('fund_transactions').update(updates).eq('id', id);
  if (err) throw new Error(err.message);
  clearCache('transactions');
}

/**
 * 删除交易记录
 */
export async function removeTransactionCloud(id: string): Promise<void> {
  const { client, error } = createClientFromConfig();
  if (!client) throw new Error(error);
  const { error: err } = await client.from('fund_transactions').delete().eq('id', id);
  if (err) throw new Error(err.message);
  clearCache('transactions');
}

/**
 * 清空某基金的全部云端交易记录
 */
export async function clearCloudTransactionsByFund(fundCode: string): Promise<void> {
  const { client, error } = createClientFromConfig();
  if (!client) throw new Error(error);
  const { error: err } = await client.from('fund_transactions').delete().eq('fundCode', fundCode);
  if (err) throw new Error(err.message);
  clearCache('transactions');
}
