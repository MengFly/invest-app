# 基金分析功能移动端适配与趋势通道预估点 - 任务规划

## 1. 需求概述

1. **移动端适配**：基金的分析按钮和弹窗目前只在桌面端（RightPanel）显示，需要在移动端（MobileDetail）也添加相同的分析按钮和 IndicatorAnalysisDialog 弹窗。

2. **趋势通道添加今日预估点**：在趋势通道图表中，在当前最新净值点之后，用灰色点标记今日的预估净值点位。预估点仅作为视觉标记，不参与通道计算。

3. **默认缩放最近1个月**：无论是移动端还是桌面端，打开分析弹窗时，ECharts dataZoom 默认聚焦到最近30天的数据范围，但用户可以通过拖拽查看全部历史数据。

## 2. 需求澄清记录

| 问题 | 用户的回答 |
|------|-----------|
| 预估点位是否参与通道计算？ | **仅视觉标记**：预估点只作为灰色点显示在图表末端，不影响均线和通道线位置 |
| 默认缩放的行为是怎样的？ | **显示全部但默认聚焦30天**：显示全部数据，初始 dataZoom 范围聚焦最近30天，用户可拖拽查看全部历史 |

## 3. 任务列表

### 任务 1：IndicatorAnalysisDialog 增加预估净值支持

| 属性 | 值 |
|------|-----|
| **描述** | 在 IndicatorAnalysisDialog 的 Props 接口中增加 `estimatedNav?: number` 和 `estimatedTime?: string` 两个可选属性。当存在预估数据且预估日期晚于最新净值日期时，在 ECharts 图表上增加一个灰色圆点的 scatter 系列表示今日预估点位。预估点仅用于视觉展示，不参与指标计算。 |
| **涉及文件** | `src/components/IndicatorAnalysisDialog.tsx` |
| **验收标准** | 1. Props 接口新增 `estimatedNav` 和 `estimatedTime` 可选属性<br>2. 当预估数据存在时，图表末端出现一个灰色圆点标记<br>3. 悬停时 tooltip 显示「预估」字样<br>4. 预估点不影响均线和通道线的位置 |

### 任务 2：IndicatorAnalysisDialog 默认缩放最近1个月

| 属性 | 值 |
|------|-----|
| **描述** | 修改 `handleChartReady` 回调，根据数据长度计算最近约30个交易日的 dataZoom 起始百分比（`start`），使弹窗打开时默认聚焦最近30天的数据。用户可拖拽 dataZoom 查看全部历史。 |
| **涉及文件** | `src/components/IndicatorAnalysisDialog.tsx` |
| **验收标准** | 1. 打开弹窗时，图表默认显示最近30个交易日的视图<br>2. 用户可以通过拖拽/滚轮缩放到全部数据<br>3. 数据量不足30个点时自动显示全部数据 |

### 任务 3：桌面端 RightPanel 传递预估净值数据

| 属性 | 值 |
|------|-----|
| **描述** | 在 RightPanel 中，将 `estimatedNavData?.estimatedNav` 和 `estimatedNavData?.estimatedTime` 作为 props 传递给 IndicatorAnalysisDialog。当前 RightPanel 已获取了估算数据但未传递给分析弹窗。 |
| **涉及文件** | `src/components/RightPanel.tsx` |
| **验收标准** | 1. IndicatorAnalysisDialog 接收到正确的预估净值数据<br>2. 趋势通道图表中显示灰色预估点 |

### 任务 4：移动端添加指标分析按钮和弹窗

| 属性 | 值 |
|------|-----|
| **描述** | 在 MobileDetail 组件中：<br>1. 导入 `IndicatorAnalysisDialog`<br>2. 新增 `indicatorAnalysisOpen` 状态<br>3. 在净值走势区域的曲线设置按钮旁边，添加一个指标分析按钮（与桌面端相同的折线图 SVG 图标）<br>4. 在组件底部添加 IndicatorAnalysisDialog，传入预估净值数据<br>5. 移动端弹窗样式需要适合小屏幕（缩小配置面板） |
| **涉及文件** | `src/components/MobileDetail.tsx` |
| **验收标准** | 1. 移动端净值走势区域显示指标分析按钮<br>2. 点击按钮弹出指标分析弹窗<br>3. 弹窗在小屏幕上布局合理，可正常操作<br>4. 趋势通道图表中显示灰色预估点 |

## 4. 执行顺序

```
任务 1 → 任务 2 → 任务 3
                 ↘ 任务 4
```

- **任务 1（预估净值支持）** 和 **任务 2（默认缩放）** 都修改 IndicatorAnalysisDialog，需要先完成
- **任务 1** 完成后，**任务 3** 和 **任务 4** 可以并行执行（分别修改 RightPanel 和 MobileDetail）
- **任务 2** 不依赖其他任务，可以与任务 1 同时修改
- 推荐顺序：先完成任务1和任务2（同一个文件），再并行执行任务3和任务4

### 关于移动端弹窗尺寸适配

当前 `IndicatorAnalysisDialog` 的 `DialogContent` 使用固定宽高 `!w-[1100px] !h-[85vh]`。在移动端需要调整为更小的宽度（如 `!w-[95vw]`），但保留高度限制。可以通过以下方式实现：

- 在 DialogContent 的 className 中添加响应式 Tailwind 类：`md:!w-[1100px] !w-[95vw]`
- 左侧配置面板在移动端可以折叠或缩小宽度

## Complements

### 1. IndicatorAnalysisDialog 增加预估净值支持
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/IndicatorAnalysisDialog.tsx` — Props 增加 `estimatedNav` 和 `estimatedTime`；在趋势通道的 chartOption 中，当预估日期晚于最新净值日期时，向 xAxis 添加预估日期、向所有 line 系列添加 null 占位、添加灰色 scatter 点标记预估净值；chartKey 加入 estimatedNav 依赖
- **审查结果**：✅ 审查通过
- **完成时间**：2026-07-13

### 2. IndicatorAnalysisDialog 默认缩放最近1个月
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/IndicatorAnalysisDialog.tsx` — handleChartReady 回调中计算 dataZoom 的 start 百分比，使弹窗打开时默认聚焦最近30天；不足30点时显示全部
- **审查结果**：✅ 审查通过
- **完成时间**：2026-07-13

### 3. 桌面端 RightPanel 传递预估净值数据
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/RightPanel.tsx` — 向 IndicatorAnalysisDialog 传递 `estimatedNavData?.estimatedNav` 和 `estimatedNavData?.estimatedTime`
- **审查结果**：✅ 审查通过
- **完成时间**：2026-07-13

### 4. 移动端添加指标分析按钮和弹窗
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/MobileDetail.tsx` — 导入 IndicatorAnalysisDialog；新增 `indicatorAnalysisOpen` 状态；在曲线设置按钮旁添加指标分析按钮；在组件底部添加 IndicatorAnalysisDialog 并传入预估净值数据
- **审查结果**：✅ 审查通过
- **完成时间**：2026-07-13
