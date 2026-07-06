# 实时估算净值 - 任务规划

## 1. 需求概述

基金卡片当前展示的「今日涨幅」使用的是最新公布的单位净值涨跌幅，而非实时的估算净值。要求调用天天基金估算净值接口（fundgz.1234567.com.cn）获取实时估值数据，替代原有的今日涨幅展示，并在净值走势图中绘制估算净值的虚线标注。

## 2. 需求澄清记录

| 问题 | 确认结果 |
|------|----------|
| 接口请求失败时如何展示？ | 显示为 `--`（明确标记不可用） |
| 请求频率如何控制？ | 页面加载时立即请求一次，之后每隔 1 分钟自动刷新 |
| 图表虚线标注形式？ | 两种都需要：水平虚线贯穿 + 曲线最右端标记点 |
| 桌面端和移动端是否都需支持？ | 是，两端均需支持 |

## 3. 任务列表

### 任务 1：创建估算净值接口服务

| 属性 | 值 |
|------|-----|
| **描述** | 在 `fundApi.ts` 中添加 `fetchEstimatedNav(code)` 函数，调用天天基金估算净值接口，处理 JSONP 响应格式 |
| **依赖关系** | 无 |
| **验收标准** | 1. 调用 `https://fundgz.1234567.com.cn/js/{code}.js?rt={timestamp}` 返回解析后的数据<br>2. 正确处理 JSONP 格式（去除 `jsonpgz(` 前缀和 `)` 后缀）<br>3. 请求失败时返回 `null`，不抛出异常<br>4. 添加 TypeScript 类型 `EstimatedNavData` |

**涉及文件：** `src/services/fundApi.ts`、`src/types/index.ts`

---

### 任务 2：创建批量估值数据 Hook（useAllEstimatedNavs）

| 属性 | 值 |
|------|-----|
| **描述** | 创建 `useAllEstimatedNavs(codes: string[])` hook，批量获取所有持仓基金的估算净值数据。支持 1 分钟轮询，返回 `Record<string, EstimatedNavData \| null>` |
| **依赖关系** | 任务 1 |
| **验收标准** | 1. 组件挂载时立即发起请求<br>2. 每隔 60 秒自动重新请求<br>3. 组件卸载时清除定时器<br>4. 返回 `Record<string, EstimatedNavData \| null>`，key 为基金代码<br>5. 请求失败的值设为 `null`，不影响其他基金 |

**涉及文件：** `src/services/fundApi.ts`、新文件 `src/hooks/useEstimatedNav.ts`

---

### 任务 3：更新基金卡片今日涨幅展示

**子任务 3a：桌面端 LeftPanel**

| 属性 | 值 |
|------|-----|
| **描述** | 在 `LeftPanel` 中引入估算净值数据，当数据可用时显示估算涨跌幅并标注"估值"，不可用时显示 `--` |
| **依赖关系** | 任务 2 |
| **验收标准** | 1. 有估算数据时显示 `gszzl`（格式如 `-1.76%`），颜色根据正负变化<br>2. 无估算数据时显示 `--`，颜色为灰色<br>3. 可以在数值旁添加"估值"小标签以示区分 |

**涉及文件：** `src/components/LeftPanel.tsx`、`src/DesktopApp.tsx`

**子任务 3b：移动端 MobileList**

| 属性 | 值 |
|------|-----|
| **描述** | 在 `MobileApp.tsx` 的 MobileList 中同样引入估算净值数据，与桌面端行为一致 |
| **依赖关系** | 任务 2 |
| **验收标准** | 与 3a 相同 |

**涉及文件：** `src/MobileApp.tsx`

---

### 任务 4：创建单基金估值数据 Hook（useEstimatedNav）

| 属性 | 值 |
|------|-----|
| **描述** | 创建 `useEstimatedNav(code: string \| undefined)` hook，支持单只基金的估算净值获取，同样支持 1 分钟轮询 |
| **依赖关系** | 任务 1 |
| **验收标准** | 1. 传入 code 时发起请求，传入 undefined 时返回 null<br>2. 60 秒自动刷新<br>3. 组件卸载时清除定时器 |

**涉及文件：** 新文件 `src/hooks/useEstimatedNav.ts`

---

### 任务 5：在净值曲线中绘制估算净值虚线

| 属性 | 值 |
|------|-----|
| **描述** | 修改 `NavChart` 组件，接收可选的 `estimatedNav` 和 `estimatedTime` 参数。在图表中绘制：1）一条贯穿的水平虚线表示估算净值位置；2）曲线末端添加特殊标记点 |
| **依赖关系** | 任务 4 |
| **验收标准** | 1. 传入 `estimatedNav` 时，在对应 y 轴位置绘制水平虚线<br>2. 虚线有标签标注"估算净值: 1.xxxx"<br>3. 曲线最右端有区别于常规端点的标记<br>4. 不传入时不影响现有图表渲染<br>5. 桌面端和移动端均生效 |

**子任务 5a：桌面端 RightPanel**

| 属性 | 值 |
|------|-----|
| **描述** | 在 `RightPanel` 中引入 `useEstimatedNav`，将估算净值传入 `NavChart` |
| **依赖关系** | 任务 4、任务 5 |
| **验收标准** | 净值走势图下方出现估算净值虚线 |

**涉及文件：** `src/components/RightPanel.tsx`

**子任务 5b：移动端 MobileDetail**

| 属性 | 值 |
|------|-----|
| **描述** | 在 `MobileDetail` 中引入 `useEstimatedNav`，将估算净值传入 `NavChart` |
| **依赖关系** | 任务 4、任务 5 |
| **验收标准** | 移动端净值走势图同样展示估算净值虚线 |

**涉及文件：** `src/MobileDetail.tsx`

---

## 4. 执行顺序

```
任务 1 (fundApi + types)
   ↓
任务 2 (useAllEstimatedNavs)  ←→  任务 4 (useEstimatedNav)
   ↓
任务 3a (LeftPanel)  ── 并行 ──  任务 3b (MobileList)    任务 5 (NavChart)
                                                                 ↓
                                                       任务 5a (RightPanel) ── 并行 ── 任务 5b (MobileDetail)
```

- **Step 1**：任务 1（接口 + 类型）— 基础无依赖，最先完成
- **Step 2**：任务 2 + 任务 4 — 均依赖任务 1，互相独立可并行
- **Step 3**：任务 3a + 3b — 依赖任务 2，互相独立可并行；任务 5（NavChart 虚线绘制）— 无数据依赖可先行
- **Step 4**：任务 5a + 5b — 依赖任务 4 和任务 5，互相独立可并行

## Complements

### 1. 估算净值接口服务 + 类型定义
- **状态**：✅ 已完成
- **修改文件**：
  - `src/types/index.ts` — 新增 `EstimatedNavData` 接口（7 字段）
  - `src/services/fundApi.ts` — 新增 `fetchEstimatedNav(code)` JSONP 实现
- **审查结果**：审查通过

### 2. useEstimatedNav / useAllEstimatedNavs hooks
- **状态**：✅ 已完成
- **修改文件**：
  - `src/hooks/useEstimatedNav.ts` — 新增两个 hook（单基金 + 批量），支持 60 秒轮询
- **审查结果**：审查通过

### 3. 基金卡片展示估算涨跌幅
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/LeftPanel.tsx` — 新增 `estimatedNavs` prop，有数据时显示"估值"+涨跌幅，无数据时显示 `--`
  - `src/DesktopApp.tsx` — 调用 `useAllEstimatedNavs` 并传递数据
  - `src/MobileApp.tsx` — 移动端列表同样展示估算涨跌幅
- **审查结果**：审查通过

### 4. NavChart 估算净值虚线
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/chart/NavChart.tsx` — 新增 `estimatedNav`/`estimatedTime` props，绘制水平虚线 + 右侧端点 + 左侧标签
- **审查结果**：审查通过

### 5. RightPanel 和 MobileDetail 传入估算净值
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/RightPanel.tsx` — 调用 `useEstimatedNav`，传入 NavChart
  - `src/MobileDetail.tsx` — 调用 `useEstimatedNav`，传入 NavChart
- **审查结果**：审查通过

### 完成总结
- **完成时间**：2026-07-06
- **全部 5 项需求均已通过审查，无遗留问题。**