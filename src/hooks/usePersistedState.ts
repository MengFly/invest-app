import { useState, useCallback } from 'react';

/**
 * useState 的 localStorage 持久化版本
 * 初始化时从 localStorage 读取，值变更时自动同步写入
 */
export function usePersistedState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // 解析失败使用默认值
    }
    return defaultValue;
  });

  const setPersistedState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // 存储失败（如配额不足）静默忽略
        }
        return next;
      });
    },
    [key],
  );

  return [state, setPersistedState];
}
