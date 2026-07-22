---
date: 2026-07-22
description: 统一项目中散落在多个文件中的缓存逻辑，封装为 getCache / removeCache 两个核心函数
---

# 缓存统一重构 - 任务规划

## 1. 需求概述

当前缓存逻辑散落在 `cache.ts`、`supabase.ts`、`transaction.ts`、`useEstimatedNav.ts`、`useFund.ts`、`useAllSummaries.ts` 六个文件中，各有不同的实现风格（getCached/setCached、getCache/setCache、readTxCache/writeTxCache、内存 Map 等）。将其统一封装为两个核心函数：

- `getCache<T>(key, timeout, get)` — 读缓存，过期或不存在时调用 `get()` 获取新数据并写入
- `removeCache(key)` — 清除缓存，支持精确清除和前缀批量清除

## 2. 需求澄清记录

| 问题 | 确认结果 |
|------|----------|
| `get` 参数类型？ | 异步 `() => Promise<T>` |
| `useEstimatedNav.ts` 的内存 Map 缓存？ | 统一到 localStorage |
| `removeCache` 是否支持前缀清除？ | 支持，key 以 `:` 结尾时视为前缀，清除所有匹配的缓存 |

## Requirements

### 1. 重构 cache.ts 核心 API

- 重写 `src/services/cache.ts`
- 导出 `getCache<T>(key: string, timeout: number, get: () => Promise<T>): Promise<T>`
  - 从 localStorage 读取缓存
  - 缓存有效（未过期）则直接返回
  - 缓存过期或不存在则调用 `get()`，将结果写入 localStorage 后返回
  - `get()` 抛出异常时透传异常
- 导出 `removeCache(key: string): void`
  - key 不以 `:` 结尾时，精确删除该 key
  - key 以 `:` 结尾时，遍历 localStorage 删除所有以该 key 为前缀的条目
- 移除旧的导出：`getCached`、`setCached`、`CACHE_KEYS`、`CACHE_TTL`、`fundInfoKey`、`fundNetWorthKey`

### 2. 替换所有调用方

- `src/hooks/useFund.ts`：`useFundBasicInfo`/`useFundNetWorth` 中的三段式缓存替换为 `getCache`
- `src/hooks/useAllSummaries.ts`：`fetchNetWorthCached`/`fetchBasicInfoCached` 替换为 `getCache`
- `src/services/supabase.ts`：`getCache`/`setCache`/`clearCache` 替换为新的 `getCache`/`removeCache`
- `src/services/transaction.ts`：`readTxCache`/`writeTxCache`/`clearTxCache`/`clearAllTxCache` 替换为 `getCache`/`removeCache`
- `src/hooks/useEstimatedNav.ts`：内存 Map 缓存替换为 `getCache`
- 所有缓存键保持与现有存储兼容

### 3. 清理与构建验证

- 确认所有旧缓存工具函数已移除
- 删除不再使用的缓存键常量、辅助函数和导入语句
- `tsc --noEmit` 无错误
- `vite build` 成功

## 3. 任务列表

### 任务 1：重构 cache.ts 核心 API

| 属性 | 值 |
|------|-----|
| **描述** | 重写 `src/services/cache.ts`，提供 `getCache<T>(key, timeout, get)` 和 `removeCache(key)` 两个导出函数。`getCache` 内部实现：检查 localStorage → 缓存有效则返回 → 过期或不存在则调用 `get()` → 写入 localStorage → 返回。`removeCache` 支持精确 key 清除和前缀匹配清除（key 末尾以 `:` 结尾时视为前缀） |
| **依赖关系** | 无 |
| **验收标准** | 1. `getCache<T>(key, timeout, get)` 签名正确<br>2. 缓存有效时直接返回，不调用 `get`<br>3. 缓存过期时调用 `get`，写入新缓存后返回<br>4. 缓存不存在时调用 `get`，写入后返回<br>5. `get` 抛出异常时透传异常<br>6. `removeCache(key)` 精确删除指定 key<br>7. `removeCache(key)` 当 key 以 `:` 结尾时，删除所有匹配前缀的 key<br>8. 移除旧的 `getCached`、`setCached`、`CACHE_KEYS`、`CACHE_TTL`、`fundInfoKey`、`fundNetWorthKey` 导出 |

### 任务 2：替换所有调用方

| 属性 | 值 |
|------|-----|
| **描述** | 将项目中所有手动三段式缓存（`getCached` → 判断 → fetch → `setCached`）替换为 `getCache` 调用，将各种 `clearCache`/`clearTxCache` 替换为 `removeCache`。涉及文件：`useFund.ts`、`useAllSummaries.ts`、`supabase.ts`、`transaction.ts`、`useEstimatedNav.ts` |
| **依赖关系** | 任务 1 |
| **验收标准** | 1. `useFund.ts` 中 `useFundBasicInfo`/`useFundNetWorth` 的缓存逻辑替换为 `getCache`<br>2. `useAllSummaries.ts` 中 `fetchNetWorthCached`/`fetchBasicInfoCached` 替换为 `getCache`<br>3. `supabase.ts` 中 `getCache`/`setCache`/`clearCache` 替换为新的 `getCache`/`removeCache`<br>4. `transaction.ts` 中的 `readTxCache`/`writeTxCache`/`clearTxCache`/`clearAllTxCache` 替换为 `getCache`/`removeCache`<br>5. `useEstimatedNav.ts` 中的内存 Map 缓存替换为 `getCache`<br>6. 所有缓存键保持与现有存储兼容（不丢失已有缓存数据） |

### 任务 3：清理与构建验证

| 属性 | 值 |
|------|-----|
| **描述** | 确认所有旧缓存工具函数已移除，删除不再使用的缓存键常量、辅助函数和导入语句，运行 TypeScript 编译和 Vite 构建验证 |
| **依赖关系** | 任务 2 |
| **验收标准** | 1. `tsc --noEmit` 无错误<br>2. `vite build` 成功<br>3. 无遗漏的旧缓存函数引用 |

## 4. 执行顺序

```
任务 1（重构 cache.ts 核心 API）
    ↓
任务 2（替换所有调用方）
    ↓
任务 3（清理与构建验证）
```

任务之间为串行依赖关系，必须按顺序执行。

## Complements

### 1. 重构 cache.ts 核心 API
- **状态**：✅ 已完成
- **修改文件**：
  - `src/services/cache.ts` — 重写为 `getCache(key, timeout, get)` 和 `removeCache(key)` 两个核心导出函数，兼容新旧缓存格式（`{ data, ts }` 和 `{ data, timestamp, ttl }`）
- **审查结果**：审查通过
- **完成时间**：2026-07-22

### 2. 替换所有调用方
- **状态**：✅ 已完成
- **修改文件**：
  - `src/hooks/useFund.ts` — 替换三段式缓存为 `getCache`，移除旧导入
  - `src/hooks/useAllSummaries.ts` — 替换 `fetchNetWorthCached`/`fetchBasicInfoCached` 为 `getCache`
  - `src/services/supabase.ts` — 替换 `getCache`/`setCache`/`clearCache` 为 `getCache`/`removeCache`，移除旧缓存辅助函数
  - `src/services/transaction.ts` — 替换 `readTxCache`/`writeTxCache`/`clearTxCache` 为 `getCache`/`removeCache`
  - `src/hooks/useEstimatedNav.ts` — 替换内存 Map 缓存为 `getCache`（localStorage 持久化）
- **审查结果**：审查通过
- **完成时间**：2026-07-22

### 3. 清理与构建验证
- **状态**：✅ 已完成
- **验证结果**：
  - `tsc --noEmit` 无错误
  - `vite build` 成功（2528 模块）
  - 所有旧缓存函数引用已清理
- **完成时间**：2026-07-22