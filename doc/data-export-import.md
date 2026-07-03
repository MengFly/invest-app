# 数据导入导出 - 任务规划

## 1. 需求概述

为 Web 应用添加数据的导入导出功能，解决 localStorage 数据无法在不同浏览器/设备间迁移的问题。导出将持久化数据（持仓、交易记录、指标配置）打包为 JSON 文件下载，导入时合并到本地数据。

**技术栈：** Vite + React + shadcn/ui + Tailwind CSS

### 数据范围（仅持久数据）

| localStorage 键 | 数据结构 | 说明 |
|----------------|---------|------|
| `portfolio:holdings` | `Holding[]` | 全部持仓 |
| `portfolio:order` | `string[]` | 拖拽排序结果 |
| `portfolio:transactions` | `Transaction[]` | 全部交易记录 |
| `portfolio:indicator-config:{fundCode}` | `IndicatorConfigMap` | 每只基金独立指标配置 |

### 导出文件格式（JSON）

```typescript
interface ExportData {
  version: number;            // 数据格式版本号，用于向前兼容
  exportedAt: string;         // 导出时间 ISO 字符串
  holdings: Holding[];
  order: string[];
  transactions: Transaction[];
  indicatorConfigs: Record<string, IndicatorConfigMap>; // key = fundCode
}
```

### 导入策略

**合并导入（非覆盖）：** 以本地数据为主，导入文件中的增量数据合并到本地：
- 持仓：文件中有但本地没有的 → 新增；本地已有的 → 跳过（保留本地）
- 交易记录：文件中有但本地没有的（按 id 去重）→ 新增
- 指标配置：文件中有但本地没有的 fundCode 键 → 新增；已有的 fundCode → 保留本地
- 排序 order：合并所有基金代码，已存在的顺序不变，新增的追加到末尾

## 2. 需求澄清记录

| # | 模糊点 | 用户确认结果 |
|---|--------|------------|
| 1 | 数据范围 | **仅持久数据**：持仓/排序/交易记录/指标配置，不含接口缓存和最近搜索 |
| 2 | 文件格式 | **JSON 文件** (.json) |
| 3 | UI 入口 | **Header 右上角**：导出/导入按钮 |
| 4 | 导入策略 | **合并导入**：以本地数据为主，文件中的增量合并进来，不覆盖已有数据 |

## 3. 任务列表

### 任务 1：创建导出导入工具函数

| 属性 | 值 |
|------|-----|
| **描述** | 在 `web/src/services/` 下创建 `dataMigration.ts`，实现 `exportData()` 从 localStorage 读取所有持久数据并组装为 `ExportData` 对象，以及 `importData(data: ExportData)` 执行合并导入逻辑 |
| **验收标准** | `exportData()` 返回包含全部 4 类数据的完整 `ExportData` 对象；`importData()` 按合并策略写入 localStorage |

### 任务 2：实现 JSON 文件下载

| 属性 | 值 |
|------|-----|
| **描述** | 实现 `downloadJson(data: ExportData, filename: string)` 函数，将数据转为 JSON 字符串并触发浏览器下载 `.json` 文件 |
| **验收标准** | 点击导出按钮后浏览器下载 `invest-data-2026-07-03.json` 文件 |

### 任务 3：实现 JSON 文件上传解析

| 属性 | 值 |
|------|-----|
| **描述** | 实现文件上传 + 解析功能：使用 `<input type="file">` 读取用户选择的 `.json` 文件，JSON.parse 解析为 `ExportData` 对象，校验 `version` 和必要字段 |
| **验收标准** | 选择文件后正确解析数据，格式错误时弹窗提示 |

### 任务 4：UI - Header 右上角导出/导入按钮

| 属性 | 值 |
|------|-----|
| **描述** | 在 HeaderStats 组件的右上角添加导出和导入按钮。导出直接触发下载。导入点击后弹出文件选择器，选完后自动解析 -> 合并 -> 成功/失败提示 |
| **依赖关系** | 依赖任务 1/2/3 |
| **验收标准** | 按钮渲染在 Header 右上角，导出/导入流程完整可用 |

### 任务 5：导入成功后触发全局刷新

| 属性 | 值 |
|------|-----|
| **描述** | 导入数据写入 localStorage 后，调用 `triggerRefresh()` 刷新所有 hooks（持仓列表、汇总数据、指标配置均重新读取） |
| **依赖关系** | 依赖任务 4 |
| **验收标准** | 导入成功后左侧持仓列表立即显示新数据 |

### 任务 6：类型检查 + 构建验证

| 属性 | 值 |
|------|-----|
| **描述** | `npx tsc --noEmit` 零错误 + `npm run build` 成功 |
| **依赖关系** | 依赖所有前置任务 |
| **验收标准** | 构建成功，dist/ 目录生成 |

## 4. 执行顺序

```
任务 1 (dataMigration 工具函数)
   ↓
任务 2 (JSON 下载) ─ 可在任务 1 后并行
任务 3 (JSON 上传解析) ─ 可在任务 1 后并行
   ↓
任务 4 (UI 按钮) ─ 依赖任务 1/2/3
   ↓
任务 5 (刷新联动) ─ 依赖任务 4
   ↓
任务 6 (构建验证)
```

## Complements

### 1. 导出导入工具函数 + 下载/上传 + UI 按钮 + 刷新联动
- **状态**：✅ 已完成
- **修改文件**：
  - `src/services/dataMigration.ts` — 新增文件，包含 `exportData()` 读取全部持久数据、`importData()` 执行合并导入、`downloadJson()` 浏览器下载、`parseImportFile()` 文件上传解析，以及内部合并逻辑（持仓去重、交易去重、指标配置按 fundCode 合并、排序合并）
  - `src/components/HeaderStats.tsx` — 在渐变卡片右上角添加「导出」「导入」两个按钮，导入成功后调用 `triggerRefresh()` 触发全局刷新
- **审查结果**：审查通过
- **完成时间**：2026-07-03
