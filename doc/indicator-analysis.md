# 指标分析（Indicator Analysis） - 任务规划

## 1. 需求概述

在桌面端基金详情右侧面板的净值走势区域，在"曲线设置"按钮右侧新增一个"指标分析"按钮。点击后弹出一个大面积弹窗，弹窗采用 **左侧配置 + 右侧图表** 的布局：
- **左侧**：指标下拉选择器 + 当前指标的配置项区域
- **右侧**：使用 ECharts 绘制的指标分析图表

首个实现的指标为 **「趋势通道」**，功能如下：
- 在净值区域绘制近N天的平均趋势线（支持 SMA 简单移动平均 / EMA 指数移动平均）
- 天数可设置，默认提供 7天 / 20天 / 30天 快捷选项，也可自定义
- 计算净值走势的标准差（支持滚动标准差 / 全局标准差，计算天数可设置，不设置则使用全部数据）
- 在均线上下 ±1 个标准差绘制通道趋势线，区间内使用半透明区域标注

**数据范围**：指标分析使用全部净值历史数据，不同步净值走势的时间范围选择。

## 2. 需求澄清记录

| 问题 | 回答 |
|------|------|
| 弹窗布局结构 | 左侧：指标下拉选择 + 配置区域；右侧：图表展示区 |
| 图表渲染方案 | 使用 ECharts |
| 弹窗尺寸 | 自适应大尺寸 |
| 数据范围 | 使用全部历史数据，不与净值走势时间范围同步 |
| 指标命名 | 「趋势通道」 |
| 标准差计算方式 | 支持滚动标准差和全局标准差两种模式，由用户配置选择 |

## 3. 技术方案

### 3.1 架构设计

```
IndicatorAnalysisDialog          // 弹窗容器
├── left panel                   // 左侧配置区
│   ├── 指标下拉选择器
│   └── 配置项面板（动态渲染）
└── right panel                  // 右侧图表区
    └── ECharts 图表

IndicatorRegistry                // 指标注册中心
├── TrendChannelIndicator        // 趋势通道指标
│   ├── configSchema             // 配置定义
│   └── compute(data, config)    // 计算逻辑
│   └── renderChart(chart, result, theme)  // ECharts 渲染

utils/indicatorCalc.ts           // 指标计算工具函数
├── calcSMA(values, period)      // 简单移动平均
├── calcEMA(values, period)      // 指数移动平均
├── calcRollingStd(values, period)  // 滚动标准差
├── calcGlobalStd(values)        // 全局标准差
└── calcTrendChannel(data, config)  // 趋势通道完整计算
```

### 3.2 ECharts 渲染方案

使用 ECharts 绘制以下内容：
- **净值曲线**：基础折线图，使用项目 theme 的主色
- **均线（SMA/EMA）**：另一条折线，使用不同颜色
- **上通道线**：均线 + 标准差，使用浅色虚线
- **下通道线**：均线 - 标准差，使用浅色虚线
- **通道区间**：上下通道线之间的半透明填充区域

## 4. 任务列表

### 任务 1：安装 ECharts 依赖

| 属性 | 值 |
|------|-----|
| **描述** | 安装 echarts 和 echarts-for-react 到项目依赖中 |
| **依赖关系** | 无 |
| **验收标准** | package.json 中新增 echarts 和 echarts-for-react 依赖，可以正常 import |

### 任务 2：创建指标可扩展架构 & 趋势通道计算模块

| 属性 | 值 |
|------|-----|
| **描述** | 1. 定义指标接口（Indicator），包含 id、name、configSchema、compute、renderChart 等方法<br>2. 创建指标注册中心（indicatorRegistry），支持注册和获取指标<br>3. 实现工具函数：calcSMA、calcEMA、calcRollingStd、calcGlobalStd<br>4. 实现 TrendChannelIndicator 的计算逻辑：均线、标准差、上下通道线 |
| **依赖关系** | 任务 1 |
| **验收标准** | 趋势通道计算逻辑正确，SMA/EMA 计算结果与手动验证一致，标准差计算正确 |

### 任务 3：创建指标分析弹窗组件（IndicatorAnalysisDialog）

| 属性 | 值 |
|------|-----|
| **描述** | 1. 使用 @radix-ui/react-dialog 创建大面积自适应弹窗<br>2. 左侧面板：指标下拉选择器 + 动态配置项渲染<br>3. 右侧面板：ECharts 图表渲染区<br>4. 趋势通道的配置项渲染（均线类型、天数、标准差类型、标准差天数）<br>5. 当配置变化时，重新计算并更新图表 |
| **依赖关系** | 任务 1、任务 2 |
| **验收标准** | 弹窗正常打开/关闭，左侧切换指标和修改配置后右侧图表正确更新 |

### 任务 4：在 RightPanel 中添加指标分析按钮

| 属性 | 值 |
|------|-----|
| **描述** | 在净值走势标题栏的"曲线设置"按钮后面添加一个"指标分析"按钮，点击打开 IndicatorAnalysisDialog，传入当前基金的净值数据 |
| **依赖关系** | 任务 3 |
| **验收标准** | 按钮显示在正确位置，点击后弹窗显示，数据正确传入 |

### 任务 5：趋势通道 ECharts 图表渲染

| 属性 | 值 |
|------|-----|
| **描述** | 在 ECharts 中渲染趋势通道指标：净值曲线、均线、上下通道线、半透明通道区域。包含图例、悬停提示、时间轴缩放等交互 |
| **依赖关系** | 任务 2、任务 3 |
| **验收标准** | 图表渲染美观，悬停显示数据提示，通道填充透明区域正确，颜色与项目主题一致 |

## 5. 执行顺序

```
任务 1（安装依赖）
   ↓
任务 2（计算模块 + 架构）
   ↓
任务 3（弹窗组件） ← 任务 5（图表渲染，可与任务3并行进行）
   ↓
任务 4（接入按钮）
```

**推荐顺序**：任务 1 → 任务 2 → 任务 3 + 任务 5（并行）→ 任务 4

其中任务 3 和任务 5 可以并行开发，因为弹窗框架和 ECharts 渲染层相对独立。但考虑到图表渲染需要看到弹窗中的效果，也可以先完成弹窗框架再接入图表渲染。

## Complements

### 1. 安装 ECharts 依赖
- **状态**：✅ 已完成
- **修改文件**：
  - `package.json` — 新增 echarts ^5.6.0 和 echarts-for-react ^3.0.2 依赖
- **审查结果**：依赖安装成功，可正常 import

### 2. 创建指标可扩展架构 & 趋势通道计算模块
- **状态**：✅ 已完成
- **修改文件**：
  - `src/utils/indicatorCalc.ts` — 新建，包含 SMA、EMA、滚动/全局标准差、趋势通道完整计算
  - `src/utils/indicatorRegistry.ts` — 新建，定义 Indicator 接口 + 注册中心 + 趋势通道指标实现（含 ECharts 渲染逻辑）
- **审查结果**：TypeScript 类型检查通过，构建通过

### 3. 创建指标分析弹窗组件（IndicatorAnalysisDialog）
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/IndicatorAnalysisDialog.tsx` — 新建，大尺寸弹窗：左侧指标选择 + 配置面板，右侧 ECharts 图表
- **审查结果**：TypeScript 类型检查通过，构建通过

### 4. 趋势通道 ECharts 图表渲染
- **状态**：✅ 已完成
- **修改文件**：
  - `src/utils/indicatorRegistry.ts` — getChartOption 实现完整 ECharts 渲染（净值曲线、均线、上下通道线、半透明通道区域、图例、tooltip、dataZoom 交互）
- **审查结果**：图表渲染逻辑完成，支持悬停提示和缩放

### 5. 在 RightPanel 中添加指标分析按钮
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/RightPanel.tsx` — 在净值走势设置按钮后添加指标分析按钮（点击图标），点击打开 IndicatorAnalysisDialog，传入基金净值数据
- **审查结果**：TypeScript 类型检查通过，构建通过

- **完成时间**：2026-07-11

### 6. 修复审查发现的 Bug
- **状态**：✅ 已完成
- **修改文件**：
  - `src/utils/indicatorCalc.ts` — Bug #2 修复：rolling 模式 + stdDays=0 时，自动降级使用 avg.period 作为滚动窗口
  - `src/utils/indicatorRegistry.ts` — Bug #1 修复：使用 ECharts stack 机制实现上下通道线之间精确填充（而非从下通道线填充到 x 轴）；Bug #4 修复：通道填充颜色使用 `colors.secondary` 主题变量动态生成 rgba
  - `src/utils/indicatorRegistry.ts` — Bug #3 修复：avgDays 从 select 改为 number 类型，支持自定义天数和预设快捷按钮
  - `src/components/IndicatorAnalysisDialog.tsx` — ConfigControl 新增 number 类型预设按钮渲染，支持快捷选择

### 7. 趋势通道叠加交易买卖点标记
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/IndicatorAnalysisDialog.tsx` — 趋势通道模式下，当有交易记录时，在图表上叠加买入（绿色）和卖出（红色）scatter 散点标记，根据交易日期匹配净值数据中的对应净值点

### 8. 修复 "下通道" 系列缺少 type 和 data 属性
- **状态**：✅ 已完成
- **问题**：`indicatorRegistry.ts` 中 "下通道"（lower-band）系列定义遗漏了 `type: 'line'` 和 `data` 两个必需属性，导致 ECharts 抛出 `Unknown series undefined` 错误，弹窗打开即报错
- **修改文件**：
  - `src/utils/indicatorRegistry.ts` — 为 lower-band 系列补充 `type: 'line'` 和 `data: lowerData.map(...)` 属性

### 9. 修复 tooltip formatter 对 scatter 系列数据格式处理错误
- **状态**：✅ 已完成
- **问题**：tooltip 的 `formatter` 函数中 `p.value` 对于 line 系列是单个数值，但 scatter 系列（买入/卖出标记点）的 data 是 `[x, y]` 数组格式。原代码直接对 `val` 调用 `.toFixed(4)`，当鼠标悬停到买卖点标记上时 `val` 是数组，导致 `val.toFixed is not a function` 报错
- **修改文件**：
  - `src/utils/indicatorRegistry.ts` — formatter 中增加数组判断：`Array.isArray(raw) ? raw[1] : raw`，scatter 系列取 y 值后再格式化
