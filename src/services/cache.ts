// localStorage 缓存层 - 带 TTL 的数据持久化缓存

// 缓存键名常量
export const CACHE_KEYS = {
  FUND_LIST: 'cache:fund-list',
  FUND_INFO_PREFIX: 'cache:fund-info:',   // 拼接 code 使用
  FUND_NETWORTH_PREFIX: 'cache:fund-net-worth:', // 拼接 code 使用
} as const;

// 缓存 TTL (毫秒)
export const CACHE_TTL = {
  FUND_LIST: 12 * 60 * 60 * 1000,   // 半天
  FUND_INFO: 12 * 60 * 60 * 1000,   // 半天
  FUND_NETWORTH: 12 * 60 * 60 * 1000, // 半天
} as const;

// 缓存条目结构
interface CacheEntry<T> {
  data: T;
  timestamp: number; // 写入时间戳
  ttl: number;       // 有效期(毫秒)
}

/**
 * 读取缓存，过期或不存在返回 null
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    // 解析失败或存储异常，返回 null 不影响主流程
    return null;
  }
}

/**
 * 写入缓存
 */
export async function setCached<T>(key: string, data: T, ttl: number): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // 写入失败静默处理，不影响主流程
  }
}

/**
 * 生成基金信息缓存键
 */
export function fundInfoKey(code: string): string {
  return `${CACHE_KEYS.FUND_INFO_PREFIX}${code}`;
}

/**
 * 生成基金净值缓存键
 */
export function fundNetWorthKey(code: string): string {
  return `${CACHE_KEYS.FUND_NETWORTH_PREFIX}${code}`;
}
