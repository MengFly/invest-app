// Supabase 云存储服务 - 管理持仓与交易记录的云端持久化
import { getCache, removeCache } from '@/services/cache';
import type { FundBasicInfo, FundListItem, Holding, NetWorthRecord, Transaction } from '@/types';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ===== 硬编码 Supabase 配置（配合 RLS，用户数据由 auth.uid() 隔离） =====
const SUPABASE_URL = 'https://narvehoftoihiqukgrsf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Nnu4Qr76vvZ1wuVkbvhuqw_oQNK-9e1';

let client: SupabaseClient | null = null;

/**
 * 获取 Supabase 客户端实例（单例，启用 Session 持久化）
 * 用户登录后 SDK 自动附加 JWT，所有请求通过 RLS 按 auth.uid() 过滤
 */
export function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return client;
}

// 云缓存键前缀（与已有缓存数据兼容）
const CACHE_PREFIX = 'supabase:cache:';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 小时

/** 清除云缓存（精确匹配 + 前缀匹配） */
function clearCloudCache(key: string): void {
  removeCache(CACHE_PREFIX + key);
  removeCache(CACHE_PREFIX + key + ':');
}

// ==================== fund_holdings CRUD ====================

/**
 * 读取全部持仓（按 order 升序）
 */
export async function fetchHoldings(): Promise<Holding[]> {
  return getCache<Holding[]>(CACHE_PREFIX + 'holdings', CACHE_TTL, async () => {
    const client = getClient();
    const { data, error: err } = await client
      .from('fund_holdings')
      .select('*')
      .order('order', { ascending: true });
    if (err) throw new Error(err.message);
    return (data ?? []).map((r: any) => ({
      code: r.code,
      name: r.name,
      addedAt: r.addedAt ?? 0,
    }));
  });
}

/**
 * 读取持仓排序（code 列表）
 */
export async function fetchOrder(): Promise<string[]> {
  return getCache<string[]>(CACHE_PREFIX + 'order', CACHE_TTL, async () => {
    const client = getClient();
    const { data, error: err } = await client
      .from('fund_holdings')
      .select('code, order')
      .order('order', { ascending: true });
    if (err) throw new Error(err.message);
    return (data ?? []).map((r: any) => r.code);
  });
}

/**
 * 添加持仓
 */
export async function addHolding(holding: Holding, sortOrder: number): Promise<void> {
  const client = getClient();
  const { error: err } = await client
    .from('fund_holdings')
    .insert({ code: holding.code, name: holding.name, addedAt: holding.addedAt, order: sortOrder });
  if (err) throw new Error(err.message);
  clearCloudCache('holdings');
  clearCloudCache('order');
}

/**
 * 删除持仓（级联删除交易记录）
 */
export async function removeHolding(code: string): Promise<void> {
  const client = getClient();
  try {
    // 先删交易记录
    await client.from('fund_transactions').delete().eq('fundCode', code);
    // 再删持仓
    const { error: err } = await client.from('fund_holdings').delete().eq('code', code);
    if (err) throw new Error(err.message);
  } finally {
    clearCloudCache('holdings');
    clearCloudCache('transactions');
    clearCloudCache('order');
  }
}

/**
 * 更新持仓排序
 */
export async function updateOrder(orderedCodes: string[]): Promise<void> {
  const client = getClient();
  const updates = orderedCodes.map((code, index) => ({
    code,
    order: index,
  }));
  // 逐个更新（Supabase 不支持批量 upsert 时指定唯一冲突）
  for (const u of updates) {
    await client.from('fund_holdings').update({ order: u.order }).eq('code', u.code);
  }
  clearCloudCache('holdings');
  clearCloudCache('order');
}

// ==================== fund_transactions CRUD ====================

/**
 * 读取全部交易记录（按 createdAt 降序）
 */
export async function fetchTransactions(fundCode?: string): Promise<Transaction[]> {
  const cacheKey = 'transactions' + (fundCode ? `:${fundCode}` : '');
  return getCache<Transaction[]>(CACHE_PREFIX + cacheKey, CACHE_TTL, async () => {
    const client = getClient();
    let query = client.from('fund_transactions').select('*').order('createdAt', { ascending: false });
    if (fundCode) {
      query = query.eq('fundCode', fundCode);
    }
    const { data, error: err } = await query;
    if (err) throw new Error(err.message);
    return (data ?? []).map((r: any) => ({
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
  });
}

/**
 * 新增交易记录
 */
export async function addTransaction(tx: Transaction): Promise<void> {
  const client = getClient();
  const { error: err } = await client.from('fund_transactions').insert(tx);
  if (err) throw new Error(err.message);
  removeCache(CACHE_PREFIX + 'transactions:' + tx.fundCode);
}

/**
 * 更新交易记录
 */
export async function updateTransactionCloud(
  id: string,
  updates: Partial<Pick<Transaction, 'date' | 'amount' | 'shares' | 'fee' | 'note'>>,
  fundCode: string
): Promise<void> {
  const client = getClient();
  const { error: err } = await client.from('fund_transactions').update(updates).eq('id', id);
  if (err) throw new Error(err.message);
  removeCache(CACHE_PREFIX + 'transactions:' + fundCode);
}

/**
 * 删除交易记录
 */
export async function removeTransactionCloud(id: string, fundCode: string): Promise<void> {
  const client = getClient();
  const { error: err } = await client.from('fund_transactions').delete().eq('id', id);
  if (err) throw new Error(err.message);
  removeCache(CACHE_PREFIX + 'transactions:' + fundCode);
}

/**
 * 清空某基金的全部云端交易记录
 */
export async function clearCloudTransactionsByFund(fundCode: string): Promise<void> {
  const client = getClient();
  const { error: err } = await client.from('fund_transactions').delete().eq('fundCode', fundCode);
  if (err) throw new Error(err.message);
  removeCache(CACHE_PREFIX + 'transactions:' + fundCode);
}

// ==================== fund_basic_info 查询（数据由后端同步，无缓存） ====================

/**
 * 从 Supabase 查询基金基本信息
 * 数据由后端服务定时同步，前端不负责写入
 * 注意：不含缓存逻辑，缓存由 hooks 层统一管理
 */
export async function fetchFundBasicInfoFromSupabase(code: string): Promise<FundBasicInfo | null> {
  const client = getClient();
  const { data, error: err } = await client
    .from('fund_basic_info')
    .select('*')
    .eq('fundCode', code)
    .maybeSingle();
  if (err) throw new Error(err.message);
  if (!data) return null;
  return data as FundBasicInfo;
}

// ==================== fund_net_worth 查询（数据由后端同步，无缓存） ====================

/**
 * 从 Supabase 查询基金净值数据
 * 数据由后端服务定时同步，前端不负责写入
 * 注意：不含缓存逻辑，缓存由 hooks 层统一管理
 */
export async function fetchFundNetWorthFromSupabase(code: string): Promise<NetWorthRecord[]> {
  const client = getClient();
  const { data, error: err } = await client
    .from('fund_net_worth')
    .select('date, netWorth, netWorthChange')
    .eq('fundCode', code)
    .order('date', { ascending: false })
    .limit(10000);
  if (err) throw new Error(err.message);
  return (data ?? []) as NetWorthRecord[];
}

// ==================== fund_basic_info 搜索（按需搜索，无缓存） ====================

/**
 * 从 Supabase 搜索基金（按 fundCode / fundName 模糊匹配）
 * 仅在用户输入时调用，不缓存
 */
export async function searchFundsFromSupabase(query: string): Promise<FundListItem[]> {
  const client = getClient();
  const pattern = `%${query}%`;
  const { data, error: err } = await client
    .from('fund_basic_info')
    .select('fundCode, fundName')
    .or(`fundCode.ilike.${pattern},fundName.ilike.${pattern}`)
    .limit(20);
  if (err) throw new Error(err.message);
  return (data ?? []).map((r: any) => ({
    code: r.fundCode,
    name: r.fundName,
  }));
}