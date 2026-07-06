# 今日预估收益 - 任务规划

## 1. 需求概述

基于天天基金实时估算净值数据，计算持仓基金的今日预估收益，展示在基金卡片和 Header 总览中。同时需要校验估算时间，若当天休市（估算时间不是今天）则跳过估算。

## 2. 需求澄清记录

| 问题 | 确认结果 |
|------|----------|
| 预估收益计算方式 | 按涨跌幅反推：`预估收益 = 持有金额 × 估算涨跌幅 / 100` |
| 休市判断方式 | 判断 `gztime` 日期是否等于今天，不等则跳过 |
| Header 展示形式 | 新增独立指标「今日预估收益」 |

## 3. 任务列表

### 任务 1：创建预估收益计算工具函数

| 属性 | 值 |
|------|-----|
| **描述** | 创建 `calcEstimatedProfit(holdAmount, estimatedChange, estimatedTime)` 工具函数，校验日期并计算预估收益 |
| **依赖关系** | 无 |
| **验收标准** | 1. 传入有效数据时返回 `holdAmount × estimatedChange / 100`<br>2. `estimatedTime` 日期不是今天时返回 `null`（休市跳过）<br>3. `estimatedChange` 为 0 时返回 0 |

**涉及文件：** 新增 `src/utils/estimatedProfit.ts`

---

### 任务 2：更新 HeaderStats 展示预估收益

| 属性 | 值 |
|------|-----|
| **描述** | 为 `HeaderStats` 组件新增 `estimatedProfit` 可选 prop，在「年化收益率」后面新增一个`今日预估收益` 指标块 |
| **依赖关系** | 任务 1 |
| **验收标准** | 1. 有预估收益时显示金额（带 +- 号和颜色）<br>2. `estimatedProfit` 为 `null`（休市/数据不可用）时隐藏该指标<br>3. 不影响现有指标展示 |

**涉及文件：** `src/components/HeaderStats.tsx`

---

### 任务 3：DesktopApp 计算并传递预估收益

| 属性 | 值 |
|------|-----|
| **描述** | 在 `DesktopApp.tsx` 中遍历持仓，利用 `estimatedNavs` 和 `summaries` 计算每只基金的预估收益和总预估收益，分别传递给 `HeaderStats` 和 `LeftPanel` |
| **依赖关系** | 任务 1、任务 2 |
| **验收标准** | 1. 正确计算每只基金预估收益<br>2. 总和传递给 HeaderStats<br>3. 日期非今天时整项跳过 |

**涉及文件：** `src/DesktopApp.tsx`

---

### 任务 4：更新 LeftPanel 展示单基金预估收益

| 属性 | 值 |
|------|-----|
| **描述** | 在 `LeftPanel` 的基金卡片中新增「预估收益」展示，使用 `estimatedNavs` 和 `summaries` 数据就地计算 |
| **依赖关系** | 任务 1 |
| **验收标准** | 1. 有估算数据时展示预估收益金额（如 `-¥176.32`），带颜色<br>2. 无估算数据或休市时不展示<br>3. 不影响现有展示布局 |

**涉及文件：** `src/components/LeftPanel.tsx`

---

### 任务 5：更新 MobileList 展示单基金预估收益

| 属性 | 值 |
|------|-----|
| **描述** | 在移动端基金列表中同样展示每只基金的预估收益 |
| **依赖关系** | 任务 1 |
| **验收标准** | 与任务 4 一致，移动端布局适配 |

**涉及文件：** `src/MobileApp.tsx`

---

## 4. 执行顺序

```
任务 1 (工具函数)
   ↓
任务 2 (HeaderStats)  ── 并行 ──  任务 4 (LeftPanel)
   ↓                             └─ 任务 5 (MobileList)
任务 3 (DesktopApp 计算并传递)
```

- **Step 1**：任务 1 — 工具函数，无依赖
- **Step 2**：任务 2 + 任务 4 + 任务 5 — 均依赖任务 1，互相独立可并行
- **Step 3**：任务 3 — 依赖任务 2（需要传递 totalEstimatedProfit 给 HeaderStats），实际与任务 2 在同一个文件中修改，可合并执行