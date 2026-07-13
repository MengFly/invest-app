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
| **描述** | 在 IndicatorAnalysisDialog 的 Props 接口中增加 `estimatedNav?: number` 和 `estimatedTime?: string` 两个可选属性。当存在预估数据且预估日期晚于最新净值日期时，在 ECharts 图表上增加一条灰色虚线净值延伸到预估点位。延伸线从最后一个实际净值连接到预估值，末端带灰色圆点标记。预估点仅用于视觉展示，不参与指标计算。 |
| **涉及文件** | `src/components/IndicatorAnalysisDialog.tsx` |
| **验收标准** | 1. Props 接口新增 `estimatedNav` 和 `estimatedTime` 可选属性<br>2. 当预估数据存在时，图表末端灰色虚线从最后一个实际净值延伸到预估净值，末端带灰色圆点<br>3. 悬停时 tooltip 显示「净值(预估)」字样<br>4. 仅净值线延伸，均线和通道线不受影响 |

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
| **描述** | 在 MobileDetail 组件中：<br>1. 导入 `IndicatorAnalysisDialog`<br>2. 新增 `indicatorAnalysisOpen` 状态<br>3. 在净值走势区域的曲线设置按钮旁边，添加一个指标分析按钮（与桌面端相同的折线图 SVG 图标）<br>4. 在组件底部添加 IndicatorAnalysisDialog，传入预估净值数据<br>5. 移动端弹窗改为全屏，左侧配置面板在移动端改为覆盖层浮在图表上方 |
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

## 5. 修正记录

### 5.1 移动端参数面板弹出后不显示

| 属性 | 值 |
|------|-----|
| **现象** | 点击"参数"按钮后端状态更新（按钮文字变为"收起参数"），但配置面板未渲染，必须调整页面大小后才显示 |
| **根因** | 最初使用 `hidden`/`block` Tailwind 类切换，后改为 React 条件渲染。但在 Radix Portal 中，flex 布局的条件渲染存在浏览器重排不触发的问题 |
| **方案演进** | ① Tailwind 类切换 → ② React 条件渲染（flex 子元素推入布局流）→ ③ **最终：absolute 覆盖层**。覆盖层不参与 flex 布局流，不触发重排 |
| **涉及文件** | `src/components/IndicatorAnalysisDialog.tsx` |

### 5.2 "参数"按钮与 Dialog 关闭按钮重叠

| 属性 | 值 |
|------|-----|
| **现象** | 移动端全屏弹窗中，标题栏右侧的"参数"按钮与 Dialog 内置的 X 关闭按钮重叠 |
| **根因** | shadcn Dialog 的 X 关闭按钮为 `absolute right-4 top-4` 定位，与标题栏右侧的"参数"按钮位置冲突 |
| **方案** | 在"参数"按钮上添加 `mr-9`（margin-right: 36px），将其向左推开避开关闭按钮 |
| **涉及文件** | `src/components/IndicatorAnalysisDialog.tsx` |

### 5.3 TypeScript 编译错误

| 属性 | 值 |
|------|-----|
| **现象** | `indicator?.configSchema.fields.length` 和 `indicator.configSchema.fields.map` 报 `TS18048` 错误 |
| **根因** | 可选链 `?.` 无法在条件分支中收窄 `indicator` 的类型。TS 认为 `indicator` 在代码块内仍可能为 `undefined` |
| **方案** | 将 `indicator?.configSchema.fields.length > 0` 改为 `indicator && indicator.configSchema.fields.length > 0` |
| **涉及文件** | `src/components/IndicatorAnalysisDialog.tsx` |

### 5.4 预估点从 scatter 散点改为净值线延伸段

| 属性 | 值 |
|------|-----|
| **现象** | 首次使用 scatter 散点显示预估净值，data 格式错误（`data: [estimatedNav]`）导致点被画在图表最左侧不可见；用户希望预估点作为净值曲线的一部分而非独立散点 |
| **方案演进** | ① scatter 散点（`data: [estimatedNav]`，错误）→ ② **最终：line 延伸段**。新增 `nav-estimated` 虚线 line 系列，数据构造为 `[null × N-1, lastNav, estimatedNav]`，从最后一个实际净值点连接到预估点 |
| **涉及文件** | `src/components/IndicatorAnalysisDialog.tsx` |

### 关于移动端弹窗布局

**最终实现方案**（经过多轮修正后）：
1. **全屏弹窗**：移动端 `!w-[100vw]`，桌面端保持 1100px 圆角弹窗（`md:rounded-2xl`）
2. **布局**：桌面端保持左右分栏；移动端配置面板改为 **absolute 覆盖层**浮在图表上方，不参与 flex 布局流，避免条件渲染导致的 flex 重排问题
3. **操作方式**：标题栏右侧有「参数」按钮（`mr-9` 避开 X 关闭按钮），展开后覆盖层有独立「关闭」按钮。图表始终挂载不销毁
4. **组件提取**：将配置面板内容提取为独立 `ConfigPanelContent` 组件，移动端和桌面端共用同一份 JSX

## Complements

### 1. IndicatorAnalysisDialog 增加预估净值支持
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/IndicatorAnalysisDialog.tsx` — Props 增加 `estimatedNav` 和 `estimatedTime`；在趋势通道的 chartOption 中，当预估日期晚于最新净值日期时，向 xAxis 添加预估日期、向所有 line 系列（均线/通道线）添加 null 截断、向净值线添加 null 截断并新增 `nav-estimated` 灰色虚线 line 系列从最后一个实际净值延伸到预估点；chartKey 加入 estimatedNav 依赖
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

### 5. 移动端弹窗布局适配（全屏 + absolute 覆盖层方案）
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/IndicatorAnalysisDialog.tsx` — 弹窗移动端改全屏（`!w-[100vw]`）；桌面端保留圆角（`md:rounded-2xl`）；布局从左右分栏改为桌面端侧栏 + 移动端 absolute 覆盖层方案；配置面板内容提取为独立 `ConfigPanelContent` 组件以避免 JSX 重复；标题栏新增「参数」按钮（`mr-9` 避开 Dialog X 关闭按钮）；覆盖层有独立「关闭」按钮
- **审查结果**：✅ 审查通过
- **完成时间**：2026-07-13

### 6. 修正：TypeScript 类型错误
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/IndicatorAnalysisDialog.tsx` — 将 `indicator?.configSchema.fields.length > 0` 改为 `indicator && indicator.configSchema.fields.length > 0`，避免 TS 无法通过可选链收窄类型的问题
- **审查结果**：✅ 审查通过
- **完成时间**：2026-07-13

### 7. 修正：预估点从 scatter 改为净值线延伸段
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/IndicatorAnalysisDialog.tsx` — 移除 scatter 散点系列，改为新增 `nav-estimated` 灰色虚线 line 系列；数据构造为 `[null × N-1, lastNav, estimatedNav]`；净值线末尾推 null 截断，其余均线/通道线不变
- **审查结果**：✅ 审查通过
- **完成时间**：2026-07-13
