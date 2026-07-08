# 移除本地存储模式 - 任务规划

## 1. 需求概述

**目标**：移除应用中的本地存储模式（localStorage），改为纯云端模式（Supabase）。用户未登录时无法使用应用，跳转到独立登录页面。

**背景**：当前应用同时支持本地存储和 Supabase 云端存储两种模式，由 `getStorageMode()` 控制。这导致：
- 大量 `if (getStorageMode() === 'cloud')` 分支判断，代码复杂度高
- 已修复的「刷新后云端数据不显示」bug 只是治标（加了自动恢复），未治本
- 用户登录后仍要同步本地数据到云端，流程冗余

**需求**：
1. 默认且仅使用 Supabase 云端存储
2. 创建独立登录页面（新 UI），非登录用户无法进入主界面
3. 移除所有本地存储模式相关的代码路径

## 2. 需求澄清记录

| 问题 | 回答 |
|------|------|
| 未登录用户如何处理？ | 强制跳转到登录页面，无法使用主界面 |
| 登录页面风格？ | 全新登录页（独立页面，非弹窗） |
| 现有 localStorage 中的本地数据？ | 不处理，视为全新开始 |
| 之前登录/登出流程中的 `setStorageMode('cloud'/'local')` 逻辑？ | 全部移除 |

## 3. 任务列表

### 任务 1：移除 `supabase.ts` 中的存储模式系统

| 属性 | 值 |
|------|-----|
| **描述** | 移除 `StorageMode` 类型、`currentMode` 变量、`getStorageMode()`、`setStorageMode()`、`clearOldConfig()`、`syncLocalToCloud()`。保留 Supabase 客户端和所有 Cloud CRUD 函数。保留 localStorage 缓存层（仅用于性能缓存）。 |
| **依赖关系** | 无 |
| **验收标准** | 1. `StorageMode` 类型不再存在<br>2. 所有存储模式相关函数被移除<br>3. 缓存层（localStorage 缓存用于性能优化）保留 |

### 任务 2：简化 `portfolio.ts` 移除本地存储分支

| 属性 | 值 |
|------|-----|
| **描述** | 移除 `portfolio.ts` 中所有 `if (getStorageMode() === 'cloud')` 分支和 localStorage 回退代码。`getHoldings()`、`getOrder()`、`addHolding()`、`removeHolding()`、`saveOrder()` 直接调用云函数。移除 `writeOrder()` 函数。 |
| **依赖关系** | 任务 1 |
| **验收标准** | 1. 持仓读取始终调用 `fetchHoldings()`<br>2. 排序读取始终调用 `fetchOrder()`<br>3. 写入操作始终走云 API<br>4. localStorage 的 `portfolio:holdings` 和 `portfolio:order` 键不再被读写 |

### 任务 3：简化 `transaction.ts` 移除本地存储分支

| 属性 | 值 |
|------|-----|
| **描述** | 移除 `transaction.ts` 中所有 `if (getStorageMode() === 'cloud')` 分支。移除 `fetchLocal()`、`writeLocal()` 函数和 `TRANSACTIONS_KEY`。`getTransactions()`、`addTransaction()` 等直接调用云函数。保留 localStorage TX_CACHE 缓存层（性能缓存）。 |
| **依赖关系** | 任务 1 |
| **验收标准** | 1. 交易记录读取始终调用 `cloudFetch()`<br>2. 写入操作始终走云 API<br>3. localStorage 的 `portfolio:transactions` 键不再被读写<br>4. 缓存层正常工作 |

### 任务 4：简化 `dataMigration.ts` 移除云端检查

| 属性 | 值 |
|------|-----|
| **描述** | 移除 `getStorageMode` 导入。导入功能中移除 `if (getStorageMode() === 'cloud')` 检查，不再自动同步到云。数据导出/导入功能保留。 |
| **依赖关系** | 任务 1 |
| **验收标准** | 1. 导入成功后不再尝试 `syncLocalToCloud()`<br>2. 导出功能正常 |

### 任务 5：创建独立登录页面

| 属性 | 值 |
|------|-----|
| **描述** | 创建 `src/pages/LoginPage.tsx`（或 `src/LoginPage.tsx`），设计全新的全屏登录页面。复用 `AuthDialog` 中的认证逻辑（`signInWithPassword`、`signUp`），但以独立页面形式呈现。包含：<br>1. 应用名称/Logo 展示<br>2. 邮箱/密码输入<br>3. 登录/注册切换<br>4. 错误提示<br>5. 登录成功后自动跳转到主界面 |
| **依赖关系** | 无 |
| **验收标准** | 1. 未登录时访问任何路由都跳转到登录页<br>2. 登录成功后跳转到主界面<br>3. 注册功能正常<br>4. 页面设计统一、美观 |

### 任务 6：修改 `App.tsx` 添加认证守卫

| 属性 | 值 |
|------|-----|
| **描述** | 修改 `App.tsx`，添加认证守卫逻辑：<br>1. 添加 `/login` 路由<br>2. 创建 `ProtectedApp` 包装器，检查 `useAuth` 状态<br>3. 认证加载中显示 loading<br>4. 未认证时重定向到 `/login`<br>5. 已认证时渲染正常路由 |
| **依赖关系** | 任务 5 |
| **验收标准** | 1. 未登录用户访问 `/` → 跳转到 `/login`<br>2. 登录后访问 `/login` → 跳转到主界面<br>3. 认证加载中显示 loading 指示器 |

### 任务 7：简化 `DesktopApp.tsx` 和 `MobileApp.tsx`

| 属性 | 值 |
|------|-----|
| **描述** | 移除两个组件中与存储模式相关的代码：<br>1. 移除 `setStorageMode`/`syncLocalToCloud`/`clearOldConfig` 导入和使用<br>2. 移除 `useEffect` 自动设置存储模式<br>3. 移除 `AuthDialog` 和登录弹窗相关状态<br>4. 移除 `handleLoginSuccess`（不再需要同步本地数据）<br>5. 简化 `handleLogout`：直接调用 `signOut()`，无需设置存储模式<br>6. 更新登出确认文案<br>7. 保留用户头像/邮箱显示和登出按钮 |
| **依赖关系** | 任务 1, 5, 6 |
| **验收标准** | 1. 页面不再包含 `setStorageMode` 相关代码<br>2. 登出后自动跳转到登录页<br>3. 不再弹出 AuthDialog<br>4. HeaderStats 中的登录按钮保持（点击跳转到 `/login`） |

## 4. 执行顺序

```
任务 1: supabase.ts 清理
     │
     ├──→ 任务 2: portfolio.ts 清理
     │
     ├──→ 任务 3: transaction.ts 清理
     │
     └──→ 任务 4: dataMigration.ts 清理
     
任务 5: 创建 LoginPage（独立）
任务 6: App.tsx 认证守卫（依赖任务 5）

任务 7: DesktopApp / MobileApp 简化（依赖任务 1, 5, 6）
```

建议按以下顺序执行：
1. **任务 1** → 核心层清理（supabase.ts）
2. **任务 5** → 创建登录页面（可并行于任务 2-4）
3. **任务 2 + 3 + 4** → 各服务层清理（可并行执行）
4. **任务 6** → 认证守卫
5. **任务 7** → 界面层清理

## Complements

### 1. 移除 `supabase.ts` 中的存储模式系统
- **状态**：✅ 已完成
- **修改文件**：
  - `src/services/supabase.ts` — 移除 `StorageMode` 类型、`currentMode`、`getStorageMode()`、`setStorageMode()`、`clearOldConfig()`、`syncLocalToCloud()` 整个函数
- **审查结果**：✅ 审查通过 — 9 项验收标准全部满足
- **完成时间**：2026-07-08

### 2. 创建独立登录页面
- **状态**：✅ 已完成
- **修改文件**：
  - `src/pages/LoginPage.tsx` — 新建全屏登录页，包含登录/注册切换、邮箱密码输入、错误提示、loading 状态
- **审查结果**：✅ 审查通过 — 10 项验收标准全部满足
- **完成时间**：2026-07-08

### 3. 修改 App.tsx 添加认证守卫

### 4. 简化 portfolio.ts 移除本地存储分支
- **状态**：✅ 已完成
- **修改文件**：
  - `src/services/portfolio.ts` — 全部重写：移除 `getStorageMode` 导入、`HOLDINGS_KEY`/`ORDER_KEY`、`writeOrder()`、所有 localStorage 回退分支；直接调用云函数
- **审查结果**：✅ 审查通过 — 4 项验收标准全部满足
- **完成时间**：2026-07-08

### 5. 简化 transaction.ts 移除本地存储分支
- **状态**：✅ 已完成
- **修改文件**：
  - `src/services/transaction.ts` — 全部重写：移除 `getStorageMode` 导入、`TRANSACTIONS_KEY`、`fetchLocal()`/`writeLocal()`、所有 localStorage 回退分支；直接调用云函数；保留 TX_CACHE 缓存层
- **审查结果**：✅ 审查通过 — 6 项验收标准全部满足
- **完成时间**：2026-07-08

### 6. 简化 dataMigration.ts 移除云端检查
- **状态**：✅ 已完成
- **修改文件**：
  - `src/services/dataMigration.ts` — 移除 `getStorageMode`/`syncLocalToCloud` 导入；移除 `importData()` 中的云端同步步骤
- **审查结果**：✅ 审查通过 — 4 项验收标准全部满足
- **完成时间**：2026-07-08

### 7. 简化 DesktopApp.tsx 和 MobileApp.tsx
- **状态**：✅ 已完成
- **修改文件**：
  - `src/DesktopApp.tsx` — 移除 `setStorageMode`/`syncLocalToCloud`/`clearOldConfig` 导入和 `useEffect`；移除 `AuthDialog` 和相关状态/回调；简化登出流程
  - `src/MobileApp.tsx` — 同上；移除顶部登录按钮（已由 AuthGuard 处理）
- **审查结果**：✅ 审查通过 — 9 项验收标准全部满足
- **完成时间**：2026-07-08

### 完成总结

所有 7 个任务均已完成并通过审查。改造效果：

- **supabase.ts**：移除存储模式系统（`StorageMode`、`currentMode`、`getStorageMode`、`setStorageMode`、`clearOldConfig`、`syncLocalToCloud`）
- **portfolio.ts**：移除所有本地存储分支，直接调用云 API
- **transaction.ts**：移除所有本地存储分支，保留缓存层
- **dataMigration.ts**：移除云端同步步骤
- **App.tsx**：添加 AuthGuard 认证守卫，添加 `/login` 路由
- **LoginPage.tsx**：全新全屏登录页
- **DesktopApp.tsx / MobileApp.tsx**：移除存储模式相关代码，简化登出流程
- **状态**：✅ 已完成
- **修改文件**：
  - `src/services/dataMigration.ts` — 移除 `getStorageMode`/`syncLocalToCloud` 导入；移除 `importData()` 中的云端同步步骤
- **审查结果**：✅ 审查通过 — 4 项验收标准全部满足
- **完成时间**：2026-07-08
- **状态**：✅ 已完成
- **修改文件**：
  - `src/App.tsx` — 添加 `/login` 路由；添加 `AuthGuard` 组件，认证加载中显示 spinner，未认证重定向到 `/login`
  - `src/pages/LoginPage.tsx` — 添加已登录检查和 hooks 顺序修复
- **审查结果**：✅ 审查通过 — 3 项验收标准全部满足
- **完成时间**：2026-07-08
