---
date: 2026-07-22
description: 将基金搜索从 fund-list.json 远程 API 迁移到 Supabase fund_basic_info 表，改为按需搜索
---

# 基金搜索 Supabase 迁移 - 任务规划

## 1. 需求概述

移除 `fund-list.json` 远程 API 依赖，改为从 Supabase 的 `fund_basic_info` 表查询基金数据。搜索方式改为用户输入时才请求 Supabase（带防抖），不再预加载全量基金列表。

## 2. 需求澄清记录

| 问题 | 确认结果 |
|------|----------|
| 搜索哪些字段？ | 同时搜索 `fundCode` 和 `fundName`，匹配任一即返回 |
| 搜索结果上限？ | 最多 20 条 |
| 搜索方式？ | 每次输入请求 Supabase（需防抖），不本地缓存全量数据 |

## 3. 任务列表

### 任务 1：在 supabase.ts 中添加基金搜索函数

| 属性 | 值 |
|------|-----|
| **描述** | 在 `src/services/supabase.ts` 中添加 `searchFundsFromSupabase(query)` 函数，搜索 `fund_basic_info` 表的 `fundCode` 和 `fundName` 字段，使用 `ilike` 模糊匹配，限制 20 条结果，返回 `FundListItem[]` 类型 |
| **依赖关系** | 无 |
| **验收标准** | 1. 函数签名 `searchFundsFromSupabase(query: string): Promise<FundListItem[]>`<br>2. 使用 `or` 条件同时搜索 `fundCode` 和 `fundName`（`ilike` 模糊匹配）<br>3. 限制返回 20 条（`.limit(20)`）<br>4. 正确映射 `fundCode` → `code`，`fundName` → `name`<br>5. 遵循现有 Supabase 查询模式 |

### 任务 2：修改 AddFundDialog 为按需搜索

| 属性 | 值 |
|------|-----|
| **描述** | 修改 `src/components/AddFundDialog.tsx`，移除 `useFundList()` 的依赖，改为在用户输入时通过 `searchFundsFromSupabase` 按需搜索，带 300ms 防抖，仅当 query 非空时才发起搜索 |
| **依赖关系** | 任务 1 |
| **验收标准** | 1. 移除 `useFundList()` 的引入和使用<br>2. 用户输入时触发 Supabase 搜索（带防抖）<br>3. query 为空时显示最近搜索，不展示基金列表<br>4. 搜索中显示加载状态<br>5. 搜索失败显示错误提示<br>6. 搜索结果为空时显示"未找到匹配的基金" |

### 任务 3：清理不再使用的代码

| 属性 | 值 |
|------|-----|
| **描述** | 清理 `fund-list.json` 相关的废弃代码：`fundApi.ts` 中的 `fetchFundList()`、`useFund.ts` 中的 `useFundList()` hook、`cache.ts` 中的 `FUND_LIST` 缓存键和 TTL |
| **依赖关系** | 任务 2（确认新代码正常运行后清理） |
| **验收标准** | 1. `fundApi.ts` 中移除 `fetchFundList` 函数及 `FundListItem` 导入<br>2. `useFund.ts` 中移除 `useFundList` 函数及 `fetchFundList`/`FundListItem` 导入<br>3. `cache.ts` 中移除 `FUND_LIST` 缓存键和 `CACHE_TTL.FUND_LIST`<br>4. `fundApi.ts` 中如不再需要 `fetchWithTimeout` 和 `BASE_URL` 也一并清理<br>5. 构建通过，无类型错误 |

## Requirements

### 1. 在 supabase.ts 中添加基金搜索函数

- 在 `src/services/supabase.ts` 中添加 `searchFundsFromSupabase(query: string)` 函数
  - 查询 `fund_basic_info` 表，选择 `fundCode, fundName` 字段
  - 使用 `or` 条件同时搜索 `fundCode` 和 `fundName`，使用 `ilike` 模糊匹配（`%{query}%`）
  - 限制返回最多 20 条（`.limit(20)`）
  - 正确映射 `fundCode` → `code`，`fundName` → `name`
  - 返回 `FundListItem[]` 类型
  - 遵循现有 Supabase 查询模式（使用 `getClient()`、错误处理）
  - 不含缓存逻辑

### 2. 修改 AddFundDialog 为按需搜索

- 修改 `src/components/AddFundDialog.tsx`
  - 移除 `useFundList()` 的引入和使用
  - 引入 `searchFundsFromSupabase` 函数
  - 添加 `useState` 管理搜索结果、加载状态、错误状态
  - 添加 `useEffect` 监听 `query` 变化，带 300ms 防抖
  - 仅当 `query` 非空时才发起搜索（空时显示最近搜索）
  - 搜索中显示加载状态
  - 搜索失败显示错误提示
  - 搜索结果为空时显示"未找到匹配的基金"

### 3. 清理不再使用的代码

- `fundApi.ts` 中移除 `fetchFundList` 函数及 `FundListItem` 导入
- `useFund.ts` 中移除 `useFundList` 函数及 `fetchFundList`/`FundListItem` 导入
- `cache.ts` 中移除 `FUND_LIST` 缓存键和 `CACHE_TTL.FUND_LIST`
- 构建通过，无类型错误

## 4. 执行顺序

```
任务 1（添加搜索函数）
    ↓
任务 2（修改 AddFundDialog）
    ↓
任务 3（清理废弃代码）
```

任务之间为串行依赖关系，必须按顺序执行。

## Complements

### 1. 在 supabase.ts 中添加基金搜索函数
- **状态**：✅ 已完成
- **修改文件**：
  - `src/services/supabase.ts` — 添加 `searchFundsFromSupabase(query)` 函数，使用 `ilike` 模糊匹配 `fundCode` 和 `fundName`，限制 20 条，返回 `FundListItem[]`
- **审查结果**：审查通过
- **完成时间**：2026-07-22

### 2. 修改 AddFundDialog 为按需搜索
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/AddFundDialog.tsx` — 移除 `useFundList()` 依赖，改为用户输入时通过 `searchFundsFromSupabase` 按需搜索，带 300ms 防抖
- **审查结果**：审查通过
- **完成时间**：2026-07-22

### 3. 清理不再使用的代码
- **状态**：✅ 已完成
- **修改文件**：
  - `src/services/fundApi.ts` — 移除 `fetchFundList`、`fetchWithTimeout`、`BASE_URL`、`REQUEST_TIMEOUT`
  - `src/hooks/useFund.ts` — 移除 `useFundList` hook
  - `src/services/cache.ts` — 移除 `FUND_LIST` 缓存键和 `CACHE_TTL.FUND_LIST`
- **审查结果**：审查通过
- **完成时间**：2026-07-22