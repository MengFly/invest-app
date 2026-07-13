# ECharts 图表重构 - 任务规划

## 1. 需求概述

将基金净值页面中的两条曲线（净值曲线 NavChart 和收益曲线 ProfitChart）从手写 SVG 实现重构为 ECharts 实现。

**背景：** 当前 NavChart 和 ProfitChart 均为纯手工 SVG 渲染，各自独立实现了缩放、平移、悬停等交互逻辑，两个组件合计约 880 行代码。项目中已安装 `echarts@^6.1.0` 和 `echarts-for-react@^3.0.6`，并在 `IndicatorAnalysisDialog` 中已有成功使用经验。

**动机：**
- **可维护性**：消除 ~800 行手写 SVG 代码，利用 ECharts 成熟 API 降低维护成本
- **移动端体验**：ECharts 原生支持触摸事件，改善当前移动端交互流畅度
- **功能扩展**：ECharts 内置 dataZoom、tooltip、markLine 等组件，便于后续功能增强

## 2. 需求澄清记录

| 问题 | 确认结果 |
|------|---------|
| 重构目标 | 以上全部：可维护性 + 移动端体验 + 功能增强 |
| 视觉风格 | 保持现有视觉风格，配色与当前主题对齐 |
| 功能保留 | 全部保留：成本线、成本线走势、交易标记点、估算净值线、悬停浮窗、缩放平移 |

## 3. 技术分析

### 3.1 现有功能映射

| 现有功能 | 当前实现方式 | ECharts 映射方案 |
|---------|------------|-----------------|
| 净值曲线 + 面积图 | SVG polyline + polygon | `lineChart` 系列，`areaStyle` |
| 持仓成本线 | SVG line 虚线 | `markLine` |
| 累计成本线 | SVG line 虚线 | `markLine` |
| 持仓成本线走势 | SVG polyline 虚线 | 独立 `lineChart` 系列 |
| 累计成本线走势 | SVG polyline 虚线 | 独立 `lineChart` 系列 |
| 交易标记点 | SVG circle 组合 | 独立 `scatterChart` 系列 |
| 估算净值线 | SVG line + circle | `markLine` |
| 悬停十字线 + 浮窗 | 手动计算 + 绝对定位 div | `tooltip` 组件 + `axisPointer` |
| 滚轮缩放 (Alt+Wheel) | 手动 `onWheel` 处理 | `dataZoom` with `zoomOnMouseWheel` |
| 拖拽平移 | 手动 `onMouseDown/Move` 处理 | `dataZoom` with `moveOnMouseMove` |
| 重置按钮 | 手动渲染 | 保留自定义按钮 |
| 收益曲线 + 面积图 | SVG polyline + polygon | `lineChart` 系列，`areaStyle` |
| 持仓收益线 | SVG polyline 虚线 | 独立 `lineChart` 系列 |
| 末端标签 | SVG rect + text 组合 | 自定义 `endLabel` 或 `markPoint` |

### 3.2 关键挑战

1. **数据归一化处理**：当前代码将原始净值映射到 0-140 的 Y 空间，ECharts 可直接使用原始值，无需手动归一化
2. **成本线走势动态计算**：需保留 `dailyProfitData` 计算逻辑，在组件内或提取为 hook
3. **视觉一致性**：需确保 ECharts 样式与现有主题完全对齐（颜色、字体、圆角等）
4. **树摇导入**：需复用现有 tree-shaking 导入模式，避免打包体积增加

### 3.3 已存在的 ECharts 导入模式（参考 IndicatorAnalysisDialog）

```typescript
import ReactEChartsCore from 'echarts-for-react/esm/core';
import * as echarts from 'echarts/core';
import { LineChart, ScatterChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, ScatterChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, CanvasRenderer]);
```

## 4. 任务列表

### 任务 1：ECharts 图表工具层

| 属性 | 值 |
|------|-----|
| **描述** | 创建共享的 ECharts 配置工具函数，包括：主题色映射、tooltip 统一格式、dataZoom 默认配置、markLine 样式函数等，避免两个图表组件重复代码 |
| **依赖关系** | 无 |
| **验收标准** | 导出主题色映射函数、tooltip 格式化函数、dataZoom 默认配置对象，可在 NavChart 和 ProfitChart 中复用 |

### 任务 2：重构 NavChart 为 ECharts

| 属性 | 值 |
|------|-----|
| **描述** | 将 NavChart.tsx 从手写 SVG 重写为 ECharts，使用 ECharts 的 lineChart 系列渲染净值曲线，scatter 系列渲染交易标记点，markLine 渲染成本线和估算净值线。需保留所有现有功能：缩放、平移、悬停浮窗、成本线、交易标记点、估算净值线 |
| **依赖关系** | 依赖任务 1 |
| **验收标准** | 1. 桌面端渲染效果与现有 SVG 版本视觉一致；2. 移动端可正常触摸交互；3. 缩放/平移功能正常；4. 悬停浮窗显示完整信息（日期、净值、涨跌幅、累计收益、持有收益）；5. 交易标记点位置正确且颜色区分买入/卖出；6. 成本线/成本线走势显示正确 |

### 任务 3：重构 ProfitChart 为 ECharts

| 属性 | 值 |
|------|-----|
| **描述** | 将 ProfitChart.tsx 从手写 SVG 重写为 ECharts，使用 ECharts 的 lineChart 系列渲染收益曲线和持仓收益线。需保留所有现有功能：缩放、平移、悬停浮窗、末端标签、持仓收益对比线 |
| **依赖关系** | 依赖任务 1 |
| **验收标准** | 1. 桌面端渲染效果与现有 SVG 版本视觉一致；2. 移动端可正常触摸交互；3. 缩放/平移功能正常；4. 悬停浮窗显示完整信息（日期、累计收益、持仓收益）；5. 末端标签（收益数值标签）显示正确 |

### 任务 4：清理旧组件

| 属性 | 值 |
|------|-----|
| **描述** | 确认两个新 ECharts 组件运行正常后，删除旧的 `NavChart.tsx` 和 `ProfitChart.tsx` 文件，以及 `Sparkline.tsx`（如不再使用），确保无遗留下来的 import 引用错误 |
| **依赖关系** | 依赖任务 2、3 完成并验证通过 |
| **验收标准** | 1. 旧文件已删除；2. 项目无编译错误；3. 桌面端和移动端图表功能正常 |

## 5. 执行顺序

```
任务 1 (ECharts 工具层)
    ├──→ 任务 2 (NavChart 重构) ← 可并行
    ├──→ 任务 3 (ProfitChart 重构) ← 可并行
    └──→ 任务 4 (清理旧组件) ← 需任务 2、3 完成后
```

- **任务 1** 是前置基础，无依赖
- **任务 2 和 3** 相互独立，可并行开发
- **任务 4** 是收尾清理，需在任务 2、3 验证通过后执行

## Complements

### 1. ECharts 图表工具层
- **状态**：✅ 已完成
- **修改文件**：
  - `src/utils/echartUtils.ts` — 创建 ECharts tree-shaking 导入注册 + 导出 ReactEChartsCore 和 echarts
- **审查结果**：审查通过 ✅
- **完成时间**：2026-07-13

### 2. 重构 NavChart 为 ECharts
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/chart/NavChart.tsx` — 从手写 SVG 重写为 ECharts，保留所有功能：净值曲线+面积图、成本线(markLine)、成本线走势、交易标记点(scatter)、估算净值线、tooltip 浮窗、dataZoom 缩放平移、重置按钮
- **审查结果**：审查通过 ✅
- **完成时间**：2026-07-13

### 3. 重构 ProfitChart 为 ECharts
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/chart/ProfitChart.tsx` — 从手写 SVG 重写为 ECharts，保留所有功能：收益曲线+面积图、持仓收益线、末端标签(markPoint)、tooltip 浮窗、dataZoom 缩放平移、重置按钮
- **审查结果**：审查通过 ✅
- **完成时间**：2026-07-13

### 4. 清理旧组件
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/Sparkline.tsx` — 删除未使用的旧 SVG 组件
- **审查结果**：审查通过 ✅
- **完成时间**：2026-07-13