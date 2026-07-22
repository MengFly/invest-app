// localStorage 缓存层 - 统一封装
// 提供两个核心函数：getCache（读 + 按需刷新）和 removeCache（精确/前缀清除）

// 缓存条目结构（兼容旧格式：{ data, ts } 和 { data, timestamp, ttl }）
interface CacheEntry<T> {
  data: T;
  timestamp?: number; // 新格式
  ttl?: number;       // 新格式
  ts?: number;        // 旧格式（supabase/transaction）
}

/**
 * 读取缓存，过期或不存在时调用 get() 获取新数据并写入
 * @param key     localStorage 键名
 * @param timeout 缓存有效期（毫秒）
 * @param get     获取新数据的异步函数
 */
export async function getCache<T>(key: string, timeout: number, get: () => Promise<T>): Promise<T> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const entry = JSON.parse(raw) as CacheEntry<T>;
      const now = Date.now();
      // 兼容新旧两种格式：新格式用 timestamp+ttl，旧格式用 ts
      const age = entry.timestamp !== undefined ? now - entry.timestamp : (entry.ts !== undefined ? now - entry.ts : Infinity);
      const ttl = entry.ttl ?? timeout;
      if (age <= ttl) {
        return entry.data; // 缓存有效
      }
      // 缓存过期，清除旧数据
      localStorage.removeItem(key);
    }
  } catch {
    // 解析失败，清除后重新获取
    localStorage.removeItem(key);
  }

  // 缓存不存在或过期，调用 get() 获取新数据
  const data = await get();
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl: timeout };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // 写入失败静默处理
  }
  return data;
}

/**
 * 清除缓存
 * - key 不以 `:` 结尾：精确删除
 * - key 以 `:` 结尾：前缀匹配删除（删除所有以该 key 开头的条目）
 */
export function removeCache(key: string): void {
  try {
    if (key.endsWith(':')) {
      // 前缀匹配：遍历 localStorage 删除所有匹配前缀的 key
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(key)) {
          localStorage.removeItem(k);
        }
      }
    } else {
      // 精确删除
      localStorage.removeItem(key);
    }
  } catch {
    // 删除失败静默处理
  }
}