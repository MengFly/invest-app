# UX 增强 + 无净值交易支持 - 任务规划

## Requirements

### 1. 移动端列表滚动位置记忆
在 useAppStore 中添加 mobileListScrollTop 状态。MobileList 组件中保存 scrollTop；从详情页返回时恢复。

验收标准：
- 列表滚动到任意位置后点击基金进入详情，返回后滚动位置与离开前一致
- 刷新页面后不恢复（默认为 0）

### 2. 创建 usePersistedState Hook
通用 Hook usePersistedState(key, defaultValue)，从 localStorage 读写，每次 setState 时同步写入。

验收标准：
- 首次渲染时从 localStorage 读取值
- 值变更时自动写入 localStorage
- localStorage 中无数据时返回默认值

### 3. 双端净值走势设置持久化
RightPanel.tsx 和 MobileDetail.tsx 中的 range、showHoldingCostLine 等 6 个 state 改为 usePersistedState。

验收标准：
- 切换日期范围后刷新页面，日期范围保持
- 取消勾选后切换基金再回来，状态保持

### 4. 无净值交易：零值检测方案
使用现有字段零值来判断待确认状态，**不新增数据库字段**：

- 加仓待确认：`type === 'buy' && shares === 0`
- 减仓待确认：`type === 'sell' && amount === 0`
- 提取共享函数 `isPendingTx(tx)` 统一判断

验收标准：
- 加仓无净值时 shares=0，减仓无净值时 amount=0
- 待确认交易不参与持仓计算（holdingCalc 跳过）
- 可正常查询显示
- 无需数据库 Schema 变更

### 5. BuyDialog/SellDialog 支持无净值交易
选定日期无净值时允许提交。加仓有金额/份额=0，减仓有份额/金额=0。

验收标准：
- 选择无净值的日期弹窗不报错
- 能正常提交保存交易
- 交易列表标记待确认状态

### 6. holdingCalc 跳过待确认交易
遍历交易记录时跳过 `isPendingTx(t)` 的交易，不参与份额/收益/成本线计算。

验收标准：
- 待确认买入/卖出不影响持仓份额
- 累计收益、持仓收益不受影响

### 7. 净值确认后自动补全机制
创建 pendingNavResolver.ts，检测 shares=0（加仓）或 amount=0（减仓）的交易，遍历净值为其计算缺失值。

验收标准：
- 净值数据更新后自动补全待确认交易
- 补全后 shares/amount 变为正确值

### 8. 交易记录列表展示待确认状态
待确认交易显示"待确认"，行背景变淡，添加 tooltip。

验收标准：
- 待确认交易醒目可识别
- 正常交易样式不变

## 1. 需求概述

三个独立但有交叉的功能改进：

1. **移动端基金列表滚动位置记忆** — 从基金列表进入详情页，返回后列表保持在之前浏览的位置
2. **双端净值走势设置持久化** — 净值走势图中勾选的显示指标和日期范围保存到 localStorage，刷新/切换基金不丢失
3. **支持无净值交易** — 净值未确认时也能加仓/减仓（金额或份额为空），累计计算时跳过，待净值确认后自动补全

## 2. 需求澄清记录

| 问题 | 确认结果 |
|------|---------|
| 移动端返回时滚动位置 | **保持滚动位置**，不回到顶部 |
| 净值走势设置持久化方式 | **localStorage**，跨会话保留 |
| 加仓无净值时字段处理 | 加仓：**有金额，份额为空**；减仓：**有份额，金额为空** |
| 待补全数据处理 | 不参与累计计算，但可查询显示；净值确认后自动补全并更新数据库 |

## 3. 任务列表

### 任务 1：移动端列表滚动位置记忆

| 属性 | 值 |
|------|-----|
| **描述** | 在 `useAppStore` 中添加 `mobileListScrollTop` 状态。`MobileList` 组件中，用户点击基金跳转详情页前，将当前 `scroll-container` 的 `scrollTop` 保存到全局状态；从详情页返回列表时，在 `useEffect` 中读取该值并调用 `scrollTo()` 恢复滚动位置。 |
| **依赖关系** | 无 |
| **验收标准** | 1. 列表滚动到任意位置后点击基金进入详情<br>2. 按返回回到列表，滚动位置与离开前一致<br>3. 刷新页面后不恢复（默认为 0） |

### 任务 2：创建 usePersistedState Hook

| 属性 | 值 |
|------|-----|
| **描述** | 创建一个通用 Hook `usePersistedState<T>(key: string, defaultValue: T)`，内部使用 `useState` 初始化时从 `localStorage` 读取，每次 `setState` 时同步写入 `localStorage`。供任务 3 和后续持久化需求复用。 |
| **依赖关系** | 无 |
| **验收标准** | 1. 传入 key 和默认值，首次渲染时从 localStorage 读取<br>2. 值变更时自动写入 localStorage<br>3. localStorage 中无数据时返回默认值<br>4. 清除 localStorage 后重新加载页面恢复默认值 |

### 任务 3：双端净值走势设置持久化

| 属性 | 值 |
|------|-----|
| **描述** | 将 `RightPanel.tsx` 和 `MobileDetail.tsx` 中的 `range`、`showHoldingCostLine`、`showCumulativeCostLine`、`showHoldingCostPolyline`、`showCumulativeCostPolyline`、`showTxDots` 这 6 个 state 从 `useState` 改为 `usePersistedState`，key 使用统一前缀（如 `nav-settings:`）。不同基金的设置独立存储（key 含基金代码），或全局统一设置。 |
| **依赖关系** | 任务 2 |
| **验收标准** | 1. 切换日期范围后刷新页面，日期范围保持<br>2. 取消勾选某指标后切换基金再回来，指标状态保持<br>3. 桌面端和移动端独立存储各自的设置 |

### 任务 4：无净值交易零值检测方案

| 属性 | 值 |
|------|-----|
| **描述** | **不新增数据库字段**，使用现有字段零值判断待确认状态。提取共享函数 `isPendingTx(tx)` 统一各处判断。<br>1. 加仓待确认：`type === 'buy' && shares === 0`<br>2. 减仓待确认：`type === 'sell' && amount === 0` |
| **依赖关系** | 无 |
| **验收标准** | 1. 无需数据库 Schema 变更<br>2. 待确认交易不参与持仓计算<br>3. 可正常查询显示 |

### 任务 5：BuyDialog/SellDialog 支持无净值交易

| 属性 | 值 |
|------|-----|
| **描述** | 改造买卖弹窗：<br>1. 当选定日期无净值时，不阻断操作，允许提交<br>2. 加仓（BuyDialog）：输入金额正常，份额自动设为 0<br>3. 减仓（SellDialog）：输入份额正常，金额自动设为 0<br>4. 弹窗中增加提示文字"净值待确认，提交后将自动补算"<br>5. 交易列表标记待确认状态（半透明 + "待确认"标签） |
| **依赖关系** | 任务 4 |
| **验收标准** | 1. 选择无净值的日期，弹窗不报错<br>2. 能正常提交保存交易<br>3. 提交后交易记录显示为待确认状态 |

### 任务 6：holdingCalc 跳过待确认交易

| 属性 | 值 |
|------|-----|
| **描述** | 修改 `src/utils/holdingCalc.ts`，在计算持仓汇总时：<br>1. 遍历交易记录时，跳过 `isPendingTx(t)` 的交易<br>2. 确保 `holdShares`、`totalInvested` 等计算不受待确认交易影响<br>3. 这些交易仍可通过 `getTransactions()` 查询显示 |
| **依赖关系** | 任务 4 |
| **验收标准** | 1. 有一笔待确认买入时，持仓份额不变<br>2. 有一笔待确认卖出时，持仓份额不变<br>3. 累计收益、持仓收益等不受影响<br>4. 正常交易的行为不变 |

### 任务 7：净值确认后自动补全机制

| 属性 | 值 |
|------|-----|
| **描述** | 创建 `src/utils/pendingNavResolver.ts`，导出 `resolveWithNetWorths(code, netWorths)`：<br>1. 查询该基金下 shares=0（加仓）或 amount=0（减仓）的交易<br>2. 遍历 `netWorths` 匹配交易日期<br>3. 加仓：`shares = amount / nav`<br>4. 减仓：`amount = shares * nav`<br>5. 更新存储<br><br>在 `RightPanel.tsx` 和 `MobileDetail.tsx` 的 `useEffect` 中触发。 |
| **依赖关系** | 任务 4、任务 5 |
| **验收标准** | 1. 净值数据更新后自动补全待确认交易<br>2. 补全后份额/金额计算正确 |

### 任务 8：交易记录列表展示待确认状态

| 属性 | 值 |
|------|-----|
| **描述** | 在交易记录列表（RightPanel 和 MobileDetail）中，`isPendingTx(tx)` 的交易：<br>1. 显示"待确认"标签<br>2. 行透明度降低（opacity: 0.6）<br>3. tooltip 提示"净值待确认，确认后将自动更新" |
| **依赖关系** | 任务 4 |
| **验收标准** | 1. 待确认交易在列表中醒目可识别<br>2. 正常交易样式不变<br>3. tooltip 显示正确提示文字 |

## 4. 执行顺序

```
任务 1 (滚动位置) ─────── 独立，可先做
                              
任务 2 (usePersistedState) ──→ 任务 3 (走势设置持久化)

任务 4 (类型改造) ──→ 任务 5 (弹窗支持无净值)
                ├──→ 任务 6 (holdingCalc 跳过)
                ├──→ 任务 8 (列表展示)
                └──→ 任务 7 (自动补全) ← 任务 5, 任务 6
```

**建议执行顺序**：
1. 先做任务 1（完全独立）
2. 任务 2 → 任务 3（持久化链路）
3. 任务 4（类型改造是后续基础）
4. 任务 5 + 任务 6 + 任务 8（可并行，修改不同文件）
5. 任务 7（依赖前面的完整数据流）

## Complements

### 1. 移动端列表滚动位置记忆
- **状态**：✅ 已完成
- **修改文件**：
  - `src/hooks/useAppStore.ts` — 添加 `mobileListScrollTop` 和 `setMobileListScrollTop` 状态
  - `src/MobileApp.tsx` — MobileList 添加 scrollRef，点击导航前保存 scrollTop，返回后恢复
- **审查结果**：✅ 通过
- **完成时间**：2026-07-07

### 2. 创建 usePersistedState Hook
- **状态**：✅ 已完成
- **修改文件**：
  - `src/hooks/usePersistedState.ts` — 新建通用 Hook，useState + localStorage 自动同步
- **审查结果**：✅ 通过
- **完成时间**：2026-07-07

### 3. 双端净值走势设置持久化
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/RightPanel.tsx` — range 等 6 个 state 改为 usePersistedState
  - `src/MobileDetail.tsx` — 同上
- **审查结果**：✅ 通过
- **完成时间**：2026-07-07

### 4. Transaction 类型增加待确认字段
- **状态**：✅ 已完成
- **修改文件**：
  - `src/types/index.ts` — Transaction 增加 pendingNav 和 navDate 可选字段
  - `src/services/supabase.ts` — fetchTransactions 映射新增字段，updateTransactionCloud 支持新字段
  - `src/services/transaction.ts` — updateTransaction 支持新字段
- **审查结果**：✅ 通过
- **完成时间**：2026-07-07

### 5. BuyDialog/SellDialog 支持无净值交易
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/BuyDialog.tsx` — 允许无净值提交，份额留空，标记 pendingNav，界面提示
  - `src/components/SellDialog.tsx` — 允许无净值提交，金额留空，标记 pendingNav，界面提示
- **完成时间**：2026-07-07

### 6. holdingCalc 跳过待确认交易
- **状态**：✅ 已完成
- **修改文件**：
  - `src/utils/holdingCalc.ts` — 遍历交易时跳过 pendingNav 交易
- **完成时间**：2026-07-07

### 7. 净值确认后自动补全机制
- **状态**：✅ 已完成
- **修改文件**：
  - `src/utils/pendingNavResolver.ts` — 新建，resolveWithNetWorths 补全待确认交易
  - `src/components/RightPanel.tsx` — useEffect 在净值加载后触发补全
  - `src/MobileDetail.tsx` — useEffect 在净值加载后触发补全
- **完成时间**：2026-07-07

### 8. 交易记录列表展示待确认状态
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/RightPanel.tsx` — 待确认交易半透明、标记"待确认"、tooltip
  - `src/MobileDetail.tsx` — 同上
- **完成时间**：2026-07-07
