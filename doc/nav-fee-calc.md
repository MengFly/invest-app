# 交易按日净值+真实费率计算 - 任务规划

## 1. 需求概述

修复加仓/减仓对话框中的两个核心计算问题：

1. **净值匹配**：当前使用最新净值（latestNav）计算份额/金额，应改为根据用户选择的交易日期查找该日（或最近交易日）的真实净值来计算
2. **手续费计算**：当前买入硬编码 0.15%、卖出硬编码 0.10%，应改为使用基金 API 返回的真实费率规则（buyRules / sellRules）

## 2. 需求澄清记录

| # | 模糊点 | 用户确认结果 |
|---|--------|------------|
| 1 | 非交易日如何处理 | **仅允许选择交易日**：用户选择无匹配净值的日期时提示非交易日 |
| 2 | 卖出费率按什么维度计算 | **首笔买入日到本次卖出日**：找出该基金最早买入交易的日期，计算持有天数，再根据 sellRules 确定费率 |

## 3. 任务列表

### 任务 1：创建 findNavByDate 工具函数

| 属性 | 值 |
|------|-----|
| **描述** | 在 `src/utils/navUtils.ts` 中创建 `findNavByDate(netWorths, date)` 函数，从净值记录数组中查找指定日期的净值。找到返回 `NetWorthRecord`，未找到返回 `null` |
| **验收标准** | 输入有匹配日期的记录时返回该记录；无匹配时返回 null |

### 任务 2：查找基金最早买入日期（计算持有天数）

| 属性 | 值 |
|------|-----|
| **描述** | 在 `src/utils/navUtils.ts` 中创建 `getEarliestBuyDate(transactions, fundCode)` 函数，返回该基金最早一条 `buy` 类型交易的 `date` 字符串 |
| **验收标准** | 有买入记录时返回最早买入日期；无买入记录时返回 null |

### 任务 3：计算买入/卖出真实费率

| 属性 | 值 |
|------|-----|
| **描述** | 在 `src/utils/navUtils.ts` 中创建 `calcBuyFeeRate(basicInfo, amount)` 根据金额范围匹配买入费率，`calcSellFeeRate(basicInfo, holdDays)` 根据持有天数匹配卖出费率 |
| **验收标准** | buyRules 按 minAmount/maxAmount 区间匹配；sellRules 按 dayStart/dayEnd 范围匹配；无匹配时返回 0 |

### 任务 4：修复 BuyDialog 净值与费率

| 属性 | 值 |
|------|-----|
| **描述** | 修改 `src/components/BuyDialog.tsx`：增加 `netWorths` 和 `basicInfo` prop；日期选择后查找匹配净值并显示；选择非交易日时弹窗提示；手续费使用 `calcBuyFeeRate` 计算结果 |
| **依赖关系** | 依赖任务 1、3 |
| **验收标准** | 选择交易日时显示该日净值并计算份额；选择非交易日时提示；手续费按真实费率显示 |

### 任务 5：修复 SellDialog 净值与费率

| 属性 | 值 |
|------|-----|
| **描述** | 修改 `src/components/SellDialog.tsx`：增加 `netWorths`、`basicInfo`、`transactions` props；日期选择后查找匹配净值；计算持有天数并匹配卖出费率；非交易日提示 |
| **依赖关系** | 依赖任务 1、2、3 |
| **验收标准** | 选择交易日时用该日净值计算到账金额；持有天数决定费率；非交易日提示 |

### 任务 6：修正 RightPanel 传递新 props

| 属性 | 值 |
|------|-----|
| **描述** | 修改 `src/components/RightPanel.tsx` 中 BuyDialog 和 SellDialog 的调用处，传入 `netWorths`、`basicInfo`、`transactions` |
| **依赖关系** | 依赖任务 4、5 |
| **验收标准** | 类型检查通过，对话框可正确接收新参数 |

### 任务 7：类型检查 + 构建验证

| 属性 | 值 |
|------|-----|
| **描述** | `npx tsc --noEmit` 零错误 + `npm run build` 成功 |
| **依赖关系** | 依赖所有前置任务 |
| **验收标准** | 构建成功 |

## 4. 执行顺序

```
任务 1 (navUtils 工具函数)
任务 2 (最早买入日期)
任务 3 (费率计算)
    这三个并行开发，无依赖
         ↓
任务 4 (BuyDialog 修复) ─ 依赖 1、3
任务 5 (SellDialog 修复) ─ 依赖 1、2、3
         ↓
任务 6 (RightPanel 传递 props) ─ 依赖 4、5
         ↓
任务 7 (构建验证)
```
