---
date: 2026-07-22
description: 修复净值走势、收益走势、指标分析图表曲线顺序反转和数据点错位问题
---

# 图表曲线修复 - 任务规划

## 1. 需求概述

用户报告净值走势、收益走势、指标分析中的曲线存在两个问题：
1. **顺序反了**：x 轴显示最近的日期在左边，最早的日期在右边（正常应为最早在左，最新在右）
2. **数据点错位**：曲线上的数据点与对应日期不匹配

用户确认：该问题在迁移到 Supabase 后出现，清理缓存后仍然存在，且三个图表（NavChart、ProfitChart、IndicatorAnalysisDialog）均受影响。

**最终修复范围**（在 dev-loop 执行中补充）：
- 修复数据排序：Supabase 查询返回后增加安全排序，确保升序
- 修复 x 轴标签：`.slice(5)` 截断导致跨年日期混淆，改为完整日期
- 修复数据量限制：`.limit(10000)` 仍只返回 1000 条，需同步调整 Supabase 服务端 `max-rows` 配置

## 2. 需求澄清记录

在之前的对话中已进行过两轮澄清，用户确认：

| 问题 | 回答 |
|------|------|
| 具体是什么"反了"？ | 顺序反了，最近的日期在左边，最早的日期在右边 |
| 数据点位置是否准确？ | 数据点位置不对（曲线上的点与对应日期不匹配） |
| 问题何时出现？ | 最近出现（迁移到 Supabase 之后） |
| 是否清理过缓存？ | 清理过，问题仍存在 |
| x 轴标签问题（dev-loop 发现） | 用户指出 `dates.map(r => r.date.slice(5))` 截断逻辑有问题，不应截取 |
| 数据量限制问题（dev-loop 发现） | 用户反馈 `.limit(10000)` 后仍只返回 1000 条，需调整 Supabase 服务端 `max-rows` 配置 |

## 3. 根因分析

### 数据流追踪

```
fetchFundNetWorthFromSupabase (Supabase 查询)
  → fetchFundNetWorth (fundApi.ts 透传)
  → getCache (cache.ts 缓存层，数据透传)
  → useFundNetWorth (useFund.ts hook)
  → MobileDetail / RightPanel
    → filteredNetWorths (按时间范围截取)
    → NavChart / profitChartCalc / IndicatorAnalysisDialog
```

### 关键代码分析

**Supabase 查询** (`src/services/supabase.ts:221-231`):
```typescript
.from('fund_net_worth')
.select('date, netWorth, netWorthChange')
.eq('fundCode', code)
.order('date', { ascending: true })  // 期望升序（最早→最新）
.limit(10000);
```

**图表假设**：所有图表组件和计算函数都假设数据为升序（最早在左，最新在右）：
- `NavChart.tsx`: `dates = netWorths.map(r => r.date.slice(5))` — x 轴按数组顺序渲染
- `profitChartCalc.ts`: 遍历 `netWorths` 时按升序处理交易
- `IndicatorAnalysisDialog`: 透传 `netWorths` 给指标计算函数

### 实际根因

最终确认三个根因：

**根因 1：数据排序问题**
Supabase 的 `.order('date', { ascending: true })` 查询结果在某些情况下为降序（最新→最早），导致：
1. x 轴标签顺序反转（最近在左，最早在右）
2. `calcDailyProfitData` / `calcHoldingProfitData` 从最新数据开始遍历，交易处理逻辑混乱
3. 指标计算（SMA/EMA/趋势通道）同样基于反向数据

**根因 2：x 轴标签截断**
`NavChart` 和 `profitChartCalc` 中 x 轴标签使用 `.slice(5)` 将日期截断为 `MM-DD` 格式，基金净值数据跨年时不同年份的同月同日显示相同标签，导致难以判断数据的实际时间顺序。

**根因 3：数据传输限制**
`fetchFundNetWorthFromSupabase` 中 `.limit(10000)` 虽已添加，但 Supabase 服务端 PostgREST 的 `max-rows` 配置默认值为 1000，服务端截断导致实际返回最多 1000 条，历史数据不全。

## 4. 任务列表

### 任务 1：数据排序安全修复

| 属性 | 值 |
|------|-----|
| **描述** | 在 `fetchFundNetWorthFromSupabase` 中 Supabase 查询返回后，对数据按 `date` 字段做一次升序排序，确保下游代码始终收到升序数据 |
| **依赖关系** | 无 |
| **验收标准** | 所有图表组件的 x 轴显示正确（最早日期在左，最新日期在右） |

### 任务 2：x 轴标签修复

| 属性 | 值 |
|------|-----|
| **描述** | 修复 `NavChart` 和 `profitChartCalc` 中 x 轴标签使用 `.slice(5)` 截断为 `MM-DD` 的问题，改为完整日期 `YYYY-MM-DD` 格式。用户指出截断逻辑导致跨年数据显示混淆 |
| **依赖关系** | 无 |
| **验收标准** | 图表 x 轴标签显示完整日期，跨年数据不再混淆 |

### 任务 3：数据量限制修复

| 属性 | 值 |
|------|-----|
| **描述** | 修复 `.limit(10000)` 仍只返回 1000 条数据的问题。需在 Supabase Dashboard → Project Settings → API → PostgREST config 中将 `max-rows` 设为更大的值（如 10000），取消服务端截断 |
| **依赖关系** | 无 |
| **验收标准** | 查询返回全部历史净值数据，不再被截断在 1000 条 |

### 任务 4：验证图表数据点

| 属性 | 值 |
|------|-----|
| **描述** | 验证 `calcDailyProfitData`、`calcHoldingProfitData` 在升序数据下的计算结果正确性，以及 `NavChart` 中交易标记点（txMarkers）是否正确匹配。验证 `IndicatorAnalysisDialog` 中指标计算正确 |
| **依赖关系** | 依赖任务 1-3 完成 |
| **验收标准** | 净值走势、收益走势、指标分析三条曲线的数据点与日期一一对应，显示正确 |

## 5. 执行顺序

```
任务 1（数据排序安全修复） + 任务 2（x 轴标签修复） + 任务 3（数据量限制修复）
       ↓
任务 4（验证图表数据点）
```

- **任务 1、2、3** 无依赖关系，可并行执行
- **任务 4** 依赖前三个任务完成，最后统一验证