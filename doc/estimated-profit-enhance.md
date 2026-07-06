# 预估收益增强 + 分红 + 管理费 - 任务规划

## 1. 需求概述

1. **今日预估收益布局调整**：将基金卡片中的「今日预估收益」与「今日涨幅」合并显示，不再单独占一行。
2. **分红功能**：在买入/卖出按钮旁新增「分红」按钮，记录基金分红事件（直接输入现金分红金额）。
3. **管理费自动计算**：根据基金基本信息中的年化管理费率，按持有天数自动计算应扣除的管理费用。

## 2. 需求澄清记录

| 模糊点 | 澄清结果 |
|--------|----------|
| 今日预估收益的布局方式 | 与「今日涨幅」合并，同一列同时显示涨跌幅百分比和预估收益金额 |
| 分红金额的输入方式 | 直接输入现金分红总金额 |
| 管理费的计算方式 | 根据基金基本信息的年化管理费率，按持有天数自动计算（`holdAmount × 年费率 ÷ 365 × 持有天数`） |

## 3. 依赖关系说明

当前代码库中**估算净值（EstimatedNav）相关功能尚未实现**，因此需要先完成估算净值的数据层（类型定义、API 调用、Hook、工具函数），再进行布局调整。

分红和管理费功能相对独立，可与估算净值功能并行开发，但管理费计算需依赖 `holdingCalc.ts` 的修改。

## 4. 任务列表

### 任务 1：估算净值数据类型与 API

| 属性 | 值 |
|------|-----|
| **描述** | 在 `types/index.ts` 中添加 `EstimatedNavData` 接口；在 `fundApi.ts` 中添加 JSONP 方式调用天天基金估算净值接口的函数 |
| **依赖关系** | 无 |
| **验收标准** | `EstimatedNavData` 类型定义完整，`fetchEstimatedNav(code)` 能正确返回估算净值数据 |

### 任务 2：useEstimatedNav Hook（含缓存）

| 属性 | 值 |
|------|-----|
| **描述** | 创建 `useEstimatedNav(code)` 和 `useAllEstimatedNavs(codes)` 两个 Hook，使用模块级 Map 缓存 + 5 分钟轮询，避免重复请求 |
| **依赖关系** | 任务 1 |
| **验收标准** | 单个基金详情页调用 `useEstimatedNav`，列表页调用 `useAllEstimatedNavs`，共享缓存，不重复请求 |

### 任务 3：预估收益工具函数

| 属性 | 值 |
|------|-----|
| **描述** | 创建 `src/utils/estimatedProfit.ts`，包含 `calcEstimatedProfit(holdAmount, estimatedChange, estimatedTime)` 和 `calcTotalEstimatedProfit(items)` 两个函数，根据 `estimatedTime` 判断是否为今天（休市判断） |
| **依赖关系** | 任务 1 |
| **验收标准** | 交易日返回预估收益，非交易日（estimatedTime 不是今天）返回 null |

### 任务 4：DesktopApp 数据流接入

| 属性 | 值 |
|------|-----|
| **描述** | 在 DesktopApp 中通过 `useMemo` 计算 `codes` 数组（稳定引用），调用 `useAllEstimatedNavs(codes)`，计算 `totalEstimatedProfit` 并传递给 HeaderStats，将 `estimatedNavs` 传递给 LeftPanel |
| **依赖关系** | 任务 2、任务 3 |
| **验收标准** | DesktopApp 正确传递估算净值数据给子组件，HeaderStats 显示总预估收益 |

### 任务 5：LeftPanel 今日预估与今日涨幅合并

| 属性 | 值 |
|------|-----|
| **描述** | 给 LeftPanel 添加 `estimatedNavs` prop，在「今日」列中同时显示涨跌幅百分比和预估收益金额（如：`+1.23%` 下方显示 `预估 +¥50.00`） |
| **依赖关系** | 任务 4 |
| **验收标准** | 基金卡片「今日」列同时显示涨跌幅和预估收益，样式一致，非交易日不显示预估收益 |

### 任务 6：MobileApp 今日预估与今日涨幅合并

| 属性 | 值 |
|------|-----|
| **描述** | 在 MobileApp 的基金卡片中，将「今日」列同时显示涨跌幅和预估收益，替换原有的 `holdDays` 行中的预估收益显示 |
| **依赖关系** | 任务 2、任务 3 |
| **验收标准** | 移动端基金卡片「今日」列同时显示涨跌幅和预估收益 |

### 任务 7：Transaction 类型新增分红类型

| 属性 | 值 |
|------|-----|
| **描述** | 在 `types/index.ts` 的 `Transaction.type` 中新增 `'dividend'` 类型，无需新增字段，分红金额存入 `amount` 字段，`shares` 设为 0，`fee` 设为 0 |
| **依赖关系** | 无 |
| **验收标准** | Transaction 类型支持 `type: 'dividend'`，编译无错误 |

### 任务 8：创建 DividendDialog 组件

| 属性 | 值 |
|------|-----|
| **描述** | 创建 `DividendDialog.tsx`，参照 BuyDialog 风格，包含：基金名称/代码展示、交易日期选择、分红金额输入、备注输入。调用 `addTransaction({ type: 'dividend', ... })` 保存 |
| **依赖关系** | 任务 7 |
| **验收标准** | 分红对话框可正常打开、填写、提交，交易记录正确保存 |

### 任务 9：在 RightPanel 添加分红按钮

| 属性 | 值 |
|------|-----|
| **描述** | 在 RightPanel 的「加仓」「减仓」按钮旁新增「分红」按钮，点击打开 DividendDialog；交易记录列表中分红类型显示为「分红」标签 |
| **依赖关系** | 任务 8 |
| **验收标准** | 「分红」按钮可见可点击，分红交易记录在列表中正确显示 |

### 任务 10：holdingCalc 支持分红计算

| 属性 | 值 |
|------|-----|
| **描述** | 修改 `summarizeHolding`，在遍历交易记录时累加分红金额（`totalDividend`），在 `totalProfit` 计算中加入分红收益：`totalProfit = holdAmount - totalInvested + totalDividend`；在 `HoldingSummary` 中新增 `totalDividend` 字段 |
| **依赖关系** | 任务 7 |
| **验收标准** | 有分红记录的基金，总收益正确包含分红金额，累计收益率正确 |

### 任务 11：holdingCalc 支持管理费自动计算

| 属性 | 值 |
|------|-----|
| **描述** | 修改 `summarizeHolding`，根据基金基本信息中的年化管理费率，按持有天数计算应扣管理费：`managementFee = holdAmount × annualRate / 365 × holdDays`；在 `HoldingSummary` 中新增 `totalManagementFee` 字段；`totalProfit` 中扣除管理费：`totalProfit = holdAmount - totalInvested + totalDividend - totalManagementFee` |
| **依赖关系** | 任务 10（需同时修改 holdingCalc） |
| **验收标准** | 持有基金的管理费正确计算，总收益已扣除管理费 |

### 任务 12：管理费信息展示

| 属性 | 值 |
|------|-----|
| **描述** | 在 HoldingSummary 新增 `totalManagementFee` 后，在 DesktopApp 的 HeaderStats 中展示「累计管理费」指标（可选），或在 FundInfoDialog 中展示已扣除的管理费总额 |
| **依赖关系** | 任务 11 |
| **验收标准** | 管理费信息在合适位置展示，数值正确 |

## 5. 执行顺序

```
任务 1（类型+API）
    ↓
任务 2（useEstimatedNav Hook）  ←→  任务 3（预估收益工具函数）
    ↓
任务 4（DesktopApp 数据流）  ─────────────────────────────┐
    ↓                                                      ↓
任务 5（LeftPanel 布局调整）                     任务 6（MobileApp 布局调整）

任务 7（Transaction 类型扩展）  ←──────────────────────────────┐
    ↓                                                          ↓
任务 8（DividendDialog 组件）                        任务 10（holdingCalc 分红计算）
    ↓                                                          ↓
任务 9（RightPanel 添加按钮）                         任务 11（holdingCalc 管理费计算）
                                                              ↓
                                                    任务 12（管理费信息展示）
```

**推荐执行顺序**：
1. 先完成估算净值相关（任务 1-6），这条链路独立且已有成熟方案
2. 再完成分红功能（任务 7-10），分红功能相对独立
3. 最后完成管理费计算（任务 11-12），需依赖分红计算中对 holdingCalc 的修改

## Complements

### 1. 估算净值数据类型与 API
- **状态**：✅ 已完成
- **修改文件**：
  - `src/types/index.ts` — 新增 `EstimatedNavData` 接口
  - `src/services/fundApi.ts` — 新增 `fetchEstimatedNav()` JSONP 实现
- **审查结果**：审查通过

### 2. useEstimatedNav Hook（含缓存）
- **状态**：✅ 已完成
- **修改文件**：
  - `src/hooks/useEstimatedNav.ts` — 新建文件，包含 `useEstimatedNav` 和 `useAllEstimatedNavs` 两个 Hook，模块级 Map 缓存 + 5 分钟轮询
- **审查结果**：审查通过

### 3. 预估收益工具函数
- **状态**：✅ 已完成
- **修改文件**：
  - `src/utils/estimatedProfit.ts` — 新建文件，包含 `calcEstimatedProfit` 和 `calcTotalEstimatedProfit`
- **审查结果**：审查通过

### 4. DesktopApp 数据流接入
- **状态**：✅ 已完成
- **修改文件**：
  - `src/DesktopApp.tsx` — 接入 `useAllEstimatedNavs`、`calcTotalEstimatedProfit`，传递 `estimatedNavs` 给 LeftPanel，`estimatedProfit` 给 HeaderStats
- **审查结果**：审查通过

### 5. LeftPanel 今日预估与今日涨幅合并
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/LeftPanel.tsx` — 添加 `estimatedNavs` prop，在「今日」列合并显示涨跌幅和预估收益
- **审查结果**：审查通过

### 6. MobileApp 今日预估与今日涨幅合并
- **状态**：✅ 已完成
- **修改文件**：
  - `src/MobileApp.tsx` — 接入 `useAllEstimatedNavs` 和 `calcEstimatedProfit`，移动端「今日」列合并显示
- **审查结果**：审查通过

### 7. Transaction 类型新增分红类型
- **状态**：✅ 已完成
- **修改文件**：
  - `src/types/index.ts` — `Transaction.type` 新增 `'dividend'`
- **审查结果**：审查通过

### 8. 创建 DividendDialog 组件
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/DividendDialog.tsx` — 新建文件，分红记录对话框
- **审查结果**：审查通过

### 9. 在 RightPanel 添加分红按钮
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/RightPanel.tsx` — 新增「分红」按钮，交易列表支持分红类型显示
- **审查结果**：审查通过

### 10. holdingCalc 支持分红计算
- **状态**：✅ 已完成
- **修改文件**：
  - `src/utils/holdingCalc.ts` — 累加 `totalDividend`，`totalProfit` 公式包含分红
  - `src/types/index.ts` — `HoldingSummary` 新增 `totalDividend` 字段
- **审查结果**：审查通过

### 11. holdingCalc 支持管理费自动计算
- **状态**：✅ 已完成
- **修改文件**：
  - `src/utils/holdingCalc.ts` — 新增 `annualMgmtFeeRate` 参数，计算 `totalManagementFee`
  - `src/types/index.ts` — `HoldingSummary` 新增 `totalManagementFee` 字段
  - `src/hooks/usePortfolio.ts` — `useHoldingDetail` 从 `basicInfo` 获取管理费率并传入
- **审查结果**：审查通过

### 12. 管理费信息展示
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/RightPanel.tsx` — 在收益概览区展示「累计管理费」指标
- **审查结果**：审查通过

### 完成总结
- **完成时间**：2026-07-06
- **所有 12 个任务均通过审查**，编译无错误
- 覆盖三大功能：估算净值数据层 + 今日预估布局调整、分红功能、管理费自动计算