# 曲线设置与缩放 - 任务规划

## 1. 需求概述

1. 移除现有的指标体系（指标文件、配置弹窗、相关 Hook）
2. 净值走势图内置设置浮窗，可勾选显示成本线、交易标记等曲线
3. 净值走势和收益走势支持 Alt+鼠标滚轮缩放，缩放时 x 轴坐标正确更新，提供重置按钮

## 2. 需求澄清记录

### Q1：曲线切换方案
> **问题**：指标体系移除后，曲线如何配置？
> - 内置固定选项（设置浮窗固定显示：净值线、成本线、交易标记三个开关）
> - 保留自定义灵活性
>
> **用户回答**：内置固定选项

### Q2：设置按钮位置
> **问题**：净值走势的设置按钮放在哪里？
> - 标题右侧（和范围选择器同一行）
> - 图表右上角（悬浮）
>
> **用户回答**：标题右侧

### Q3：缩放重置方式
> **问题**：缩放后如何回到原始视图？
> - 需要重置按钮（在图表角落显示"重置"）
> - 自动恢复（切换范围时自动重置）
>
> **用户回答**：需要重置按钮

## 3. 涉及到的曲线

| 曲线 | 来源 | 处理后 |
|------|------|--------|
| 净值线（主曲线） | NavChart 内置 | 始终显示 |
| 交易标记（买入/卖出圆点） | NavChart 内置 | 可切换 |
| 成本线（水平参考线） | cost-line 指标 → 移除 | 内置到 NavChart，可切换 |
| 收益曲线（主曲线） | ProfitChart 内置 | 始终显示 |
| 收益端点标签 | profit-end-label 指标 → 移除 | ProfitChart 已有 endLabel prop，不受影响 |
| 日收益率叠加线 | daily-return-overlay 指标 → 移除 | 不再需要 |
| 持仓收益/今日收益/持有金额 | top 指标 → 已由概览卡片替代 | 已移除 |

## 4. 任务列表

### 任务 1：移除指标体系

| 属性 | 值 |
|------|-----|
| **描述** | 删除整个 `src/indicators/` 目录及其注册逻辑；删除 `IndicatorConfigDialog`、`useIndicatorResults`、`useIndicatorConfig`、`indicatorConfig` 服务；从 types 中清理指标相关类型（保留图表需要的基础类型）；从 RightPanel 中移除相关导入、状态、图标按钮和 overlay 传递 |
| **涉及文件** | `src/indicators/`（全删）、`src/components/IndicatorConfigDialog.tsx`（删）、`src/hooks/useIndicatorResults.ts`（删）、`src/hooks/useIndicatorConfig.ts`（删）、`src/services/indicatorConfig.ts`（删）、`src/types/index.ts`（清理）、`src/components/RightPanel.tsx`（清理） |
| **验收标准** | 项目构建通过，无残留指标引用，指标配置齿轮按钮消失 |

### 任务 2：NavChart 内置曲线设置浮窗

| 属性 | 值 |
|------|-----|
| **描述** | NavChart 移除 `overlay` prop；标题右侧添加设置按钮（齿轮图标），点击弹出浮窗，内含「成本线」「交易标记」两个开关；成本线计算直接内置于 NavChart（使用 summary 的持仓成本线/累计成本线）；交易标记受开关控制 |
| **涉及文件** | `src/components/chart/NavChart.tsx`、`src/components/RightPanel.tsx` |
| **验收标准** | 点击设置按钮显示浮窗，开关控制成本线横线和交易小圆点的显示/隐藏 |

### 任务 3：Alt+滚轮缩放（NavChart + ProfitChart）

| 属性 | 值 |
|------|-----|
| **描述** | 两个图表组件（NavChart、ProfitChart）均支持 Alt+鼠标滚轮缩放：检测 `altKey` 滚轮事件，缩放以鼠标所在 x 轴位置为中心，动态调整可见数据范围；x 轴标签根据缩放范围重新计算；缩放后图表角落显示「重置」按钮；点击范围按钮（近6月等）自动重置缩放 |
| **涉及文件** | `src/components/chart/NavChart.tsx`、`src/components/chart/ProfitChart.tsx` |
| **验收标准** | Alt+滚轮缩放图表，x 轴日期标签随缩放范围更新，重置按钮恢复全视图 |

## 5. 执行顺序

```
任务 1 (移除指标) → 任务 2 (内置曲线设置) → 任务 3 (缩放)
```

- **任务 1** 必须先完成，否则残留的指标引用会导致编译错误
- **任务 2** 依赖任务 1 清理后的 NavChart
- **任务 3** 与任务 2 无直接依赖，可以合并开发或串行

## Complements

### 1. 移除指标体系
- **状态**：✅ 已完成
- **修改文件**：
  - `src/indicators/` — 整个目录删除（index.ts、registry.ts、_mockContext.ts、cost-line.ts、daily-return-overlay.ts、hold-amount.ts、hold-profit.ts、profit-end-label.ts、today-profit.ts）
  - `src/components/IndicatorConfigDialog.tsx` — 删除
  - `src/components/TopIndicatorGrid.tsx` — 删除
  - `src/hooks/useIndicatorResults.ts` — 删除
  - `src/hooks/useIndicatorConfig.ts` — 删除
  - `src/services/indicatorConfig.ts` — 删除
  - `src/components/chart/OverlayRenderer.tsx` — 删除
  - `src/types/index.ts` — 移除所有指标相关类型（IndicatorGroup、Indicator、IndicatorPosition、ConfigFieldType、ConfigField、IndicatorConfig、IndicatorResult、IndicatorContext、IndicatorDefinition、IndicatorState、IndicatorConfigMap、ChartCoords、ValueResult）
  - `src/components/RightPanel.tsx` — 移除 useIndicatorResults、OverlayRenderer、IndicatorConfigDialog 导入；移除 configOpen 状态、Settings 按钮和 IndicatorConfigDialog 渲染
  - `src/services/dataMigration.ts` — 移除 IndicatorConfigMap 引用和 indicator config 导入导出逻辑
- **审查结果**：审查通过，无残留引用
- **完成时间**：2026-07-03

### 2. NavChart 内置曲线设置浮窗
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/RightPanel.tsx` — 新增 navSettingsOpen、showCostLine、showTxDots 状态；净值走势标题右侧添加齿轮设置按钮 + 浮动面板（成本线/交易标记 checkbox）；传入相关 props 给 NavChart
  - `src/components/chart/NavChart.tsx` — 移除 overlay prop，新增 showCostLine、showTxDots、summary props；内置累计成本线（虚线）和交易标记开关控制
  - `src/components/chart/ProfitChart.tsx` — 移除 overlay prop 和 ChartCoords 引用
- **审查结果**：审查通过
- **完成时间**：2026-07-03

### 3. Alt+滚轮缩放
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/chart/NavChart.tsx` — 新增 zoomRange state，Alt+滚轮以鼠标位置为中心缩放，x 轴标签动态计算，右上角「重置」按钮
  - `src/components/chart/ProfitChart.tsx` — 同上
  - `src/components/RightPanel.tsx` — NavChart 和 ProfitChart 分别添加 `key={`nav-${range}`}` 和 `key={`profit-${range}`}` 以在切换范围时自动重置缩放
- **审查结果**：审查通过（修复了一个 ProfitChart 缺少 key 的问题）
- **完成时间**：2026-07-03
