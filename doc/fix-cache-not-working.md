# 修复页面刷新时缓存不生效问题 - 任务规划

## 1. 需求概述

**问题描述**：每次刷新页面时，Supabase 云端的持仓和交易数据都会被重新请求，缓存未生效。理想行为是：仅在用户修改数据或缓存过期时才调用接口。

**根因分析**：`src/services/supabase.ts` 中有 3 处 `clearCache()` 调用游离在函数外部（模块顶级作用域），导致每次模块被导入（即每次页面加载）时，自动清空了 Supabase 云缓存 `supabase:cache:holdings` 和 `supabase:cache:transactions*`，后续的读取请求无法命中缓存，只能发 HTTP 请求。

## 2. 需求澄清记录

| 问题 | 回答 |
|------|------|
| 使用的存储模式 | Supabase 云端模式 |
| 看到的具体接口调用 | Supabase 数据库查询（fund_transactions / fund_holdings） |

## 3. 任务列表

### 任务 1：修复 `supabase.ts` 中游离的 `clearCache` 调用

| 属性 | 值 |
|------|-----|
| **描述** | 将 `removeHolding` 函数后的两行 `clearCache('holdings')` 和 `clearCache('transactions')` 移入函数体内；将 `updateOrder` 函数后的 `clearCache('holdings')` 移入函数体内 |
| **依赖关系** | 无 |
| **验收标准** | 1. 模块导入时不再自动执行 `clearCache`<br>2. `removeHolding` 执行后仍会清理缓存<br>3. `updateOrder` 执行后仍会清理缓存 |

### 任务 2：优化交易记录缓存的读取策略（可选增强）

| 属性 | 值 |
|------|-----|
| **描述** | 当前 `transaction.ts` 中的 `getTransactions()` 的本地缓存仅在 `fundCode` 为 `undefined` 时生效，但所有调用方都传了具体的 `fundCode`。改为支持按基金代码粒度的缓存（`cache:transactions:{fundCode}`），减少重复读取 |
| **依赖关系** | 任务 1 |
| **验收标准** | 1. 传入具体 `fundCode` 时也能命中缓存<br>2. 写入操作后仍会清除相关缓存 |

## 4. 关键代码定位

**Bug 位置** `src/services/supabase.ts:269-271` 和 `src/services/supabase.ts:287`：

```typescript
// 第 260-268 行：removeHolding 函数
export async function removeHolding(code: string): Promise<void> {
  const { client, error } = createClientFromConfig();
  if (!client) throw new Error(error);
  await client.from('fund_transactions').delete().eq('fundCode', code);
  const { error: err } = await client.from('fund_holdings').delete().eq('code', code);
  if (err) throw new Error(err.message);
}
  // ← 第 270-271 行：这些 clearCache 不在函数体内！
  clearCache('holdings');
  clearCache('transactions');

// 第 275-286 行：updateOrder 函数
export async function updateOrder(orderedCodes: string[]): Promise<void> {
  // ...
  for (const u of updates) {
    await client.from('fund_holdings').update({ order: u.order }).eq('code', u.code);
  }
}
  // ← 第 287 行：这个 clearCache 也不在函数体内！
  clearCache('holdings');
```

## 5. 执行顺序

1. **任务 1**（核心修复）→ 直接修改 `supabase.ts`，将游离的 `clearCache` 移入正确的函数体
2. **任务 2**（可选增强）→ 视情况决定是否需要优化本地交易缓存
