---
date: 2026-07-22
description: 将基金实时估算净值数据源从天天基金 JSONP 接口迁移到 Supabase fund_estimation 表
---

# 估算净值 Supabase 迁移 - 任务规划

## 1. 需求概述

将基金实时估算净值的数据源从天天基金 JSONP 接口（`fundgz.1234567.com.cn`）迁移到 Supabase 的 `fund_estimation` 表，由后端服务定时同步数据，前端直接查询 Supabase。

**目标表结构：**
```sql
create table public.fund_estimation (
  "funcCode" character varying not null,
  created_at timestamp with time zone not null default now(),
  "netWorth" numeric null,
  "netWorthChange" numeric null,
  constraint fund_estimation_pkey primary key ("funcCode")
) TABLESPACE pg_default;
```

## 2. 需求澄清记录

| 问题 | 回答 |
|------|------|
| 是否完全移除天天基金 JSONP 接口？ | 完全替换，移除 JSONP 代码 |
| `funcCode` 是 typo 还是实际列名？ | 实际列名，代码中映射为 `fundCode` |
| 是否还需要 5 分钟轮询刷新？ | 保持轮询，缓存逻辑不变 |
| 是否需要 RLS 策略？ | 需要，与 `fund_net_worth` 一致 |

## 3. 任务列表

### 任务 1：新建 Supabase 查询函数

| 属性 | 值 |
|------|-----|
| **描述** | 在 `src/services/supabase.ts` 中新增 `fetchEstimatedNavFromSupabase(code)` 函数，从 `fund_estimation` 表按 `funcCode` 查询估算净值数据，返回 `EstimatedNavData` 格式。字段映射：`funcCode → fundCode`、`netWorth → estimatedNav`、`netWorthChange → estimatedChange`、`created_at → estimatedTime`（格式化为字符串） |
| **依赖关系** | 无 |
| **验收标准** | 函数能正确查询 Supabase 并返回映射后的 `EstimatedNavData`（查询不到时返回 null） |

### 任务 2：替换 fetchEstimatedNav 实现

| 属性 | 值 |
|------|-----|
| **描述** | 修改 `src/services/fundApi.ts` 中的 `fetchEstimatedNav` 函数，将 JSONP 实现替换为调用 `fetchEstimatedNavFromSupabase`。移除 `fetchSeq`、`script` 注入、`window.jsonpgz` 回调等所有 JSONP 相关代码，保留函数签名不变 |
| **依赖关系** | 依赖任务 1 完成 |
| **验收标准** | `fetchEstimatedNav` 不再发起 JSONP 请求，改为查询 Supabase，返回格式与之前一致 |

### 任务 3：配置 RLS 策略

| 属性 | 值 |
|------|-----|
| **描述** | 在 Supabase Dashboard 中为 `fund_estimation` 表添加 RLS 策略，允许已登录用户读取数据：`CREATE POLICY "Enable read for authenticated users" ON public.fund_estimation FOR SELECT TO authenticated USING (true)` |
| **依赖关系** | 无 |
| **验收标准** | 登录用户能正常查询 `fund_estimation` 表数据 |

### 任务 4：验证端到端数据流

| 属性 | 值 |
|------|-----|
| **描述** | 验证 `useEstimatedNav` 和 `useAllEstimatedNavs` 在切换到 Supabase 后正常工作，估算净值在详情页（NavChart 预估线、IndicatorAnalysisDialog 预估点）和列表页（LeftPanel 今日涨跌）显示正确 |
| **依赖关系** | 依赖任务 1-3 完成 |
| **验收标准** | 估算净值功能与切换前行为一致，列表页显示今日涨跌，详情页显示预估线 |

## 4. 执行顺序

```
任务 1（新建查询函数） + 任务 3（配置 RLS）
       ↓
任务 2（替换 fetchEstimatedNav 实现）
       ↓
任务 4（验证端到端数据流）
```

- **任务 1 和任务 3** 无依赖关系，可并行执行
- **任务 2** 依赖任务 1 完成（需要先有查询函数才能替换）
- **任务 4** 依赖前三个任务完成，最后统一验证

## Complements

### 1. 估算净值 Supabase 迁移

- **状态**：✅ 已完成
- **修改文件**：
  - `src/services/supabase.ts` — 新增 `fetchEstimatedNavFromSupabase` 函数，从 `fund_estimation` 表查询估算净值，返回 `EstimatedNavData` 格式
  - `src/services/fundApi.ts` — 替换 `fetchEstimatedNav` 实现，移除全部 JSONP 代码（`fetchSeq`、script 注入、`window.jsonpgz` 回调等），改为调用 Supabase
  - `src/hooks/useEstimatedNav.ts` — 更新注释，移除"天天基金""JSONP"等引用
  - `src/types/index.ts` — 更新注释，移除"天天基金"引用
- **RLS 策略**：✅ 已在 Supabase Dashboard 配置
- **审查结果**：✅ 审查通过