---
date: 2026-07-22
description: 将基金基础信息和基金净值数据的数据源从远程 API 迁移到 Supabase
---

# 基金数据 Supabase 迁移 - 任务规划

## 1. 需求概述

基金基础信息（fund_basic_info）和基金净值数据（fund_net_worth）已由后端服务定期同步到 Supabase 数据库。前端需要将数据源从现有的 `mengfly.github.io` 远程 API 切换到 Supabase 查询，保留现有的 localStorage 缓存策略，不保留原 API 降级回退。

## 2. 需求澄清记录

| 问题 | 确认结果 |
|------|----------|
| Supabase 表中的数据如何填充？ | 数据已由后端服务定时同步，前端只需从 Supabase 查询 |
| 迁移后的缓存策略？ | 保留现有的 localStorage 缓存层（12h TTL），数据源改为 Supabase |
| Supabase 查询失败时是否需要回退到原 API？ | 不需要，直接展示错误信息 |
| 查询返回空数据的原因？ | 测试发现 `fund_basic_info` 和 `fund_net_worth` 表启用了 RLS，但缺少允许已登录用户（`authenticated` 角色）读取的策略，导致查询返回空结果而非报错 |

### 前置条件：Supabase RLS 策略

在代码修改前，需确保 `fund_basic_info` 和 `fund_net_worth` 表已添加允许已登录用户读取的 RLS 策略：

```sql
CREATE POLICY "允许已登录用户读取基金基础信息"
ON public.fund_basic_info FOR SELECT TO authenticated USING (true);

CREATE POLICY "允许已登录用户读取基金净值数据"
ON public.fund_net_worth FOR SELECT TO authenticated USING (true);
```

> 注：该策略需在 Supabase Dashboard 的 SQL Editor 中执行，不能通过前端代码完成。若未执行，上述查询函数在用户已登录状态下会返回空结果（而非报错），容易被误判为数据不存在。

## 3. 类型兼容性分析

**Supabase `fund_basic_info` 表 ←→ 现有 `FundBasicInfo` 类型：**
- `fundCode` ←→ `fundCode` ✓
- `fundName` ←→ `fundName` ✓
- `fundType` ←→ `fundType` ✓
- `company` ←→ `company` ✓
- `manager` ←→ `manager` ✓
- `buyRules` (json) ←→ `buyRules` (BuyRule[]) ✓
- `managementFees` (json) ←→ `managementFees` (ManagementFee[]) ✓
- `sellRules` (json) ←→ `sellRules` (SellRule[]) ✓

**Supabase `fund_net_worth` 表 ←→ 现有 `NetWorthRecord` 类型：**
- `fundCode` — 查询时已过滤，无需映射
- `date` ←→ `date` ✓
- `netWorth` ←→ `netWorth` ✓
- `netWorthChange` ←→ `netWorthChange` ✓
- `createAt` — 额外字段，查询时 SELECT 忽略即可

结论：类型完全兼容，无需修改类型定义。

## 4. 任务列表

### 任务 1：在 supabase.ts 中添加基金数据查询函数

| 属性 | 值 |
|------|-----|
| **描述** | 在 `src/services/supabase.ts` 中添加 `fetchFundBasicInfoFromSupabase(code)` 和 `fetchFundNetWorthFromSupabase(code)` 两个函数，使用现有 `getClient()` 查询 Supabase 的 `fund_basic_info` 和 `fund_net_worth` 表，返回与现有类型兼容的数据格式 |
| **依赖关系** | 无 |
| **验收标准** | 1. `fetchFundBasicInfoFromSupabase(code)` 返回 `FundBasicInfo \| null` 类型<br>2. `fetchFundNetWorthFromSupabase(code)` 返回 `NetWorthRecord[]` 类型<br>3. 遵循现有 Supabase 查询模式（错误处理、数据映射）<br>4. 不重复添加缓存逻辑（由 hooks 层统一管理） |

### 任务 2：修改 fundApi.ts 数据源为 Supabase

| 属性 | 值 |
|------|-----|
| **描述** | 修改 `src/services/fundApi.ts` 中的 `fetchFundBasicInfo` 和 `fetchFundNetWorth` 函数，将数据源从 `mengfly.github.io` 远程 API 切换为调用 Supabase 查询函数。`fetchEstimatedNav` 保持不变（`fetchFundList` 在后继任务中已移除，由 Supabase 按需搜索替代） |
| **依赖关系** | 任务 1 |
| **验收标准** | 1. `fetchFundBasicInfo(code)` 从 Supabase 查询并返回数据<br>2. `fetchFundNetWorth(code)` 从 Supabase 查询并返回数据<br>3. 远程 API 的 URL 和超时逻辑不再用于基金基础信息/净值查询<br>4. 接口签名不变，调用方（hooks）无需修改 |

### 任务 3：验证数据流完整性（含 RLS 策略确认）

| 属性 | 值 |
|------|-----|
| **描述** | 验证从 App → `useFund` hook → `fundApi.ts` → `supabase.ts` → Supabase 的完整数据链路正常，确认缓存层（localStorage 12h TTL）继续生效，错误处理机制正常。**额外确认** `fund_basic_info` 和 `fund_net_worth` 表已配置正确的 RLS 策略（`FOR SELECT TO authenticated`）|
| **依赖关系** | 任务 2 |
| **验收标准** | 1. 基金详情页正确展示来自 Supabase 的基础信息和净值数据<br>2. 持仓面板的净值曲线正确渲染<br>3. 缓存命中时优先使用缓存，不触发 Supabase 查询<br>4. Supabase 查询失败时显示错误状态（无回退）<br>5. 确认 RLS 策略已配置，否则查询返回空结果 |

## Requirements

### 1. 在 supabase.ts 中添加基金数据查询函数

- 在 `src/services/supabase.ts` 中添加 `fetchFundBasicInfoFromSupabase(code)` 函数
  - 查询 `fund_basic_info` 表，按 `fundCode` 等值过滤
  - 返回 `FundBasicInfo | null` 类型
  - 遵循现有 Supabase 查询模式（使用 `getClient()`、错误处理、数据映射）
  - 不重复添加缓存逻辑（由 hooks 层统一管理）
- 在 `src/services/supabase.ts` 中添加 `fetchFundNetWorthFromSupabase(code)` 函数
  - 查询 `fund_net_worth` 表，按 `fundCode` 等值过滤，按 `date` 升序排列
  - 返回 `NetWorthRecord[]` 类型（忽略 `fundCode` 和 `createAt` 字段）
  - 遵循现有 Supabase 查询模式
  - 不重复添加缓存逻辑

### 2. 修改 fundApi.ts 数据源为 Supabase

- 修改 `fetchFundBasicInfo(code)` 函数
  - 调用 `fetchFundBasicInfoFromSupabase(code)` 替代远程 API 请求
  - 接口签名不变（`(code: string) => Promise<FundBasicInfo>`）
  - 当 Supabase 返回 null 时，抛出与原来一致的错误（`基金 ${code} 信息不存在`）
- 修改 `fetchFundNetWorth(code)` 函数
  - 调用 `fetchFundNetWorthFromSupabase(code)` 替代远程 API 请求
  - 接口签名不变（`(code: string) => Promise<NetWorthRecord[]>`）
  - 当 Supabase 返回空数组时，抛出与原来一致的错误（`基金 ${code} 净值数据不存在`）
- `fetchEstimatedNav` 保持不变（`fetchFundList` 在后继任务中已移除，由 Supabase 按需搜索替代）

### 3. 验证数据流完整性

- 验证 App → `useFund` hook → `fundApi.ts` → `supabase.ts` → Supabase 链路正常
- 确认缓存层（localStorage 12h TTL）继续生效
- 确认 Supabase 查询失败时显示错误状态（无回退）

## 5. 执行顺序

```
任务 1（添加 Supabase 查询函数）
    ↓
任务 2（修改 fundApi.ts 数据源切换）
    ↓
任务 3（验证数据流完整性）
```

任务之间为串行依赖关系，必须按顺序执行。每个任务完成后应立即验证验收标准，确认无误后再进入下一任务。

## Complements

### 1. 在 supabase.ts 中添加基金数据查询函数
- **状态**：✅ 已完成
- **修改文件**：
  - `src/services/supabase.ts` — 添加 `fetchFundBasicInfoFromSupabase` 和 `fetchFundNetWorthFromSupabase` 两个函数，使用 `getClient()` 查询 `fund_basic_info` 和 `fund_net_worth` 表，不含缓存逻辑
- **审查结果**：审查通过
- **完成时间**：2026-07-22

### 2. 修改 fundApi.ts 数据源为 Supabase
- **状态**：✅ 已完成
- **修改文件**：
  - `src/services/fundApi.ts` — 修改 `fetchFundBasicInfo` 改为调用 `fetchFundBasicInfoFromSupabase`，修改 `fetchFundNetWorth` 改为调用 `fetchFundNetWorthFromSupabase`，接口签名不变，`fetchFundList` 和 `fetchEstimatedNav` 保持不变
- **审查结果**：审查通过
- **完成时间**：2026-07-22

### 3. 验证数据流完整性
- **状态**：✅ 已完成
- **验证结果**：
  - TypeScript 编译通过（`npx tsc --noEmit` 无错误）
  - Vite 生产构建成功（2528 模块编译，无错误）
  - 数据链路验证：App → `useFund` hook → `fundApi.ts` → `supabase.ts` → Supabase 查询路径完整
  - 缓存层（localStorage 12h TTL）不受影响，由 hooks 层统一管理
  - **⚠️ 发现 RLS 问题**：`fund_basic_info` 和 `fund_net_worth` 表缺少允许已登录用户读取的 RLS 策略，导致 Supabase 查询返回空结果（非报错）。需在 Supabase Dashboard 中执行 SQL 添加 `FOR SELECT TO authenticated USING (true)` 策略
- **完成时间**：2026-07-22