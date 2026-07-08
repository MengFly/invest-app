# 优化交易缓存清除粒度 - 任务规划

## 1. 需求概述

**问题描述**：基金加减仓（买入/卖出）后，所有基金的交易记录缓存都被清除，导致返回列表时所有基金的数据都重新从 API 获取。

**期望行为**：加减仓后，只应清除该基金的交易缓存（`cache:transactions:{fundCode}`），其他基金的缓存不受影响。

**根因分析**：存在两层缓存清除逻辑，都使用全量清除：

- `supabase.ts` 中 `clearCache('transactions')` — 清除所有 `supabase:cache:transactions*` 键
- `transaction.ts` 中 `clearAllTxCache()` — 清除所有 `cache:transactions*` 键

**关键发现**：全量缓存（`cache:transactions` 无 fundCode 后缀）实际上**从未被任何代码创建过**。所有调用 `getTransactions()` 的地方都传入了具体的 `fundCode`。因此修复只需清除该基金的 cache，无需处理全量缓存。

## 2. 需求澄清记录

| 问题 | 回答 |
|------|------|
| 是否所有调用方在写入时都能拿到 fundCode？ | 是，BuyDialog/SellDialog/DividendDialog/EditTransactionDialog/pendingNavResolver 都有 fundCode |
| 全量缓存是否需要清除？ | 是，全量缓存包含所有基金数据，任何交易变更都使其过期 |
| 删除持仓（removeHolding）时呢？ | 该情况需要清除所有缓存，因为没有特定基金需要保留 |

## 3. 任务列表

### 任务 1：优化 `supabase.ts` 中的交易缓存清除

| 属性 | 值 |
|------|-----|
| **描述** | 新增 `clearTransactionCache(fundCode)` 函数：只清除 `supabase:cache:transactions:{fundCode}` 该基金缓存。更新 `addTransaction`/`updateTransactionCloud`/`removeTransactionCloud`/`clearCloudTransactionsByFund` 使用定向清除。注意：全量缓存 `supabase:cache:transactions` 不会被创建，无需处理。 |
| **依赖关系** | 无 |
| **验收标准** | 1. `addTransaction(tx)` 只清除 `transactions:{tx.fundCode}`<br>2. `updateTransactionCloud(id, ..., fundCode)` 只清除 `transactions:{fundCode}`<br>3. `removeTransactionCloud(id, fundCode)` 只清除 `transactions:{fundCode}`<br>4. `clearCloudTransactionsByFund(fundCode)` 只清除 `transactions:{fundCode}`<br>5. `removeHolding(code)` 清除所有交易缓存（不做定向） |

### 任务 2：优化 `transaction.ts` 中的交易缓存清除

| 属性 | 值 |
|------|-----|
| **描述** | 新增 `clearTxCache(fundCode)` 函数替代 `clearAllTxCache()`：只清除 `cache:transactions:{fundCode}` 该基金缓存。更新 `addTransaction`/`removeTransaction`/`updateTransaction`/`removeByFund` 使用定向清除。为 `removeTransaction`/`updateTransaction` 增加 `fundCode` 参数。注意：全量缓存 `cache:transactions` 不会被创建，无需处理。 |
| **依赖关系** | 任务 1 |
| **验收标准** | 1. `addTransaction(record)` 只清除 `cache:transactions:{record.fundCode}`<br>2. `updateTransaction(id, ..., fundCode)` 只清除 `cache:transactions:{fundCode}`<br>3. `removeTransaction(id, fundCode)` 只清除 `cache:transactions:{fundCode}`<br>4. `removeByFund(fundCode)` 只清除 `cache:transactions:{fundCode}`<br>5. 全量缓存不被影响 |

### 任务 3：更新调用方传递 fundCode

| 属性 | 值 |
|------|-----|
| **描述** | 更新所有 `updateTransaction`/`removeTransaction` 的调用方，传入 `fundCode`：<br>1. `EditTransactionDialog.tsx` — handleSave 传入 `transaction.fundCode`，handleDelete 传入 `transaction.fundCode`<br>2. `pendingNavResolver.ts` — 循环中传入 `tx.fundCode` |
| **依赖关系** | 任务 2 |
| **验收标准** | 所有 `updateTransaction` 和 `removeTransaction` 调用都传入了正确的 `fundCode` |

## 4. 关键代码定位

### `supabase.ts` 缓存清除

- 第 52-70 行：`clearCache(key?)` 函数 — 当 key 为 `'transactions'` 时，清除所有 `supabase:cache:transactions*`
- 第 201 行：`addTransaction(tx)` → `clearCache('transactions')`
- 第 214 行：`updateTransactionCloud(id, updates)` → `clearCache('transactions')`
- 第 224 行：`removeTransactionCloud(id)` → `clearCache('transactions')`
- 第 234 行：`clearCloudTransactionsByFund(fundCode)` → `clearCache('transactions')`
- 第 140 行：`removeHolding(code)` → `clearCache('transactions')`

### `transaction.ts` 缓存清除

- 第 42-50 行：`clearAllTxCache()` — 清除所有 `cache:transactions*`
- 第 73 行：`addTransaction(record)` → `clearAllTxCache()`
- 第 79 行：`removeTransaction(id)` → `clearAllTxCache()`
- 第 87 行：`updateTransaction(id, updates)` → `clearAllTxCache()`
- 第 92 行：`removeByFund(fundCode)` → `clearAllTxCache()`

### 调用方

- `EditTransactionDialog.tsx:53` — `updateTransaction(transaction.id, {...})` → 改为 `updateTransaction(transaction.id, {...}, transaction.fundCode)`
- `EditTransactionDialog.tsx:73` — `removeTransaction(transaction.id)` → 改为 `removeTransaction(transaction.id, transaction.fundCode)`
- `pendingNavResolver.ts:40` — `updateTransaction(tx.id, updates)` → 改为 `updateTransaction(tx.id, updates, tx.fundCode)`

## 5. 执行顺序

1. **任务 1**（supabase.ts 缓存定向清除）
2. **任务 2**（transaction.ts 缓存定向清除）
3. **任务 3**（调用方传递 fundCode）

## Complements

### 1. 优化 supabase.ts 中交易缓存清除
- **状态**：✅ 已完成
- **修改文件**：
  - `src/services/supabase.ts` — 新增 `clearTransactionCache(fundCode)` 定向清除函数；更新 `addTransaction`/`updateTransactionCloud`/`removeTransactionCloud`/`clearCloudTransactionsByFund` 使用定向清除
- **审查结果**：✅ 审查通过 — 6 项验收标准全部满足
- **完成时间**：2026-07-08

### 2. 优化 transaction.ts 中交易缓存清除
- **状态**：✅ 已完成
- **修改文件**：
  - `src/services/transaction.ts` — 新增 `clearTxCache(fundCode)` 定向清除函数替代原有全量清除；为 `removeTransaction`/`updateTransaction` 增加 `fundCode` 参数；保留 `clearAllTxCache()` 用于导入场景
- **审查结果**：✅ 审查通过 — 6 项验收标准全部满足
- **完成时间**：2026-07-08

### 3. 更新调用方传递 fundCode
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/EditTransactionDialog.tsx` — `updateTransaction` 和 `removeTransaction` 调用新增 `transaction.fundCode` 参数
  - `src/utils/pendingNavResolver.ts` — `updateTransaction` 调用新增 `tx.fundCode` 参数
- **审查结果**：✅ 审查通过 — 3 项验收标准全部满足
- **完成时间**：2026-07-08

### 完成总结

所有 3 个任务均已完成并通过审查。改动总结：

- **supabase.ts**：新增 `clearTransactionCache(fundCode)` → 只清除 `supabase:cache:transactions:{fundCode}`
- **transaction.ts**：新增 `clearTxCache(fundCode)` → 只清除 `cache:transactions:{fundCode}`，保留 `clearAllTxCache()` 用于导入
- **EditTransactionDialog.tsx / pendingNavResolver.ts**：所有写入操作传递 `fundCode` 实现定向缓存清除

**效果**：买入/卖出基金后，仅该基金的交易缓存被清除，其他基金的缓存命中，避免不必要的 API 请求。
