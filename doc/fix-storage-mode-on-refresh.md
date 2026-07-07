# 修复刷新页面后云端数据不显示 - 任务规划

## 1. 需求概述

**问题描述**：用户登录后使用云端存储（Supabase），一切正常。但当用户关闭页面后再次打开（或刷新页面），虽然登录状态保持（UI 显示已登录），但持仓数据为空，无法从云端加载数据。

**产生条件**：
- 用户已经登录并切换到云端模式
- 页面刷新/冷启动后，Supabase 会话保持有效（JWT 持久化）
- 但数据显示为空

**根因分析**：`src/services/supabase.ts` 中的 `currentMode` 是一个模块级运行时变量，每次页面加载时默认重置为 `'local'`：

```typescript
let currentMode: StorageMode = 'local';
```

`setStorageMode('cloud')` 仅在用户手动点击登录按钮后的 `handleLoginSuccess` 回调中被调用。当用户在已登录状态下刷新页面时：

1. Supabase 会话成功恢复（`useAuth` 中的 `getSession()`）✅
2. 但 `getStorageMode()` 返回 `'local'`（模块变量重置）❌
3. 数据读取走 localStorage 而非 Supabase
4. 如果 localStorage 为空或缓存过期 → 用户看到空白页面

## 2. 需求澄清记录

| 问题 | 回答 |
|------|------|
| 是否只有刷新/冷启动后出现？登录过程中是否正常？ | 登录过程正常，刷新后问题重现 |
| 当前页面显示用户已登录，但数据为空？ | 是的，登录状态保持但数据不加载 |
| 本地模式（未登录）下是否有此问题？ | 否，本地模式数据在 localStorage 中，不受影响 |
| 问题是否与缓存 TTL 有关？ | 间接相关。缓存过期后 localStorage 无数据，但问题本质是存储模式未正确恢复，导致应用根本没从云端读取 |

## 3. 任务列表

### 任务 1：自动恢复云端存储模式

| 属性 | 值 |
|------|-----|
| **描述** | 在 `DesktopApp.tsx` 和 `MobileApp.tsx` 中添加 `useEffect`，当检测到用户已认证（`!authLoading && user`）时，自动调用 `setStorageMode('cloud')`，确保页面刷新后存储模式随认证状态恢复 |
| **依赖关系** | 无 |
| **验收标准** | 1. 登录后刷新页面，数据正常从 Supabase 加载<br>2. 退出登录后刷新页面，数据走本地模式<br>3. 未登录用户不受影响（保持本地模式）<br>4. 登录流程不受影响 |

### 任务 2（可选）：统一模式恢复逻辑（重构增强）

| 属性 | 值 |
|------|-----|
| **描述** | 将模式恢复逻辑提取到 `useAuth` hook 中，或者在 `supabase.ts` 中提供一个 `initStorageMode(session)` 函数，避免在 `DesktopApp` 和 `MobileApp` 中重复逻辑。同时考虑是否需要持久化存储模式的用户偏好 |
| **依赖关系** | 任务 1 |
| **验收标准** | 逻辑统一，两处调用复用同一段代码 |

## 4. 关键代码定位

### 问题根源

`src/services/supabase.ts:32-33` — 模块变量默认值为 `'local'`：
```typescript
let currentMode: StorageMode = 'local';
```

`src/services/supabase.ts:46-48` — `setStorageMode` 只在这里被设为 `'cloud'`，但仅在登录回调中调用：
```typescript
export function setStorageMode(mode: StorageMode): void {
  currentMode = mode;
}
```

### 需要修改的文件（任务 1）

**`src/DesktopApp.tsx`** — 添加 `useEffect` 自动恢复云端模式：
- 当前登录回调已包含 `setStorageMode('cloud')`（第 53 行）
- 需要在 `useAuth` 的 `user` / `authLoading` 状态变化时也自动调用

**`src/MobileApp.tsx`** — 同样添加 `useEffect` 自动恢复云端模式：
- 当前登录回调已包含 `setStorageMode('cloud')`（第 49 行）
- 同上需要自动恢复

## 5. 执行顺序

1. **任务 1**（核心修复）→ 修改 `DesktopApp.tsx` 和 `MobileApp.tsx`，各添加一个 `useEffect` 在认证状态变为已登录时自动恢复云端模式
2. **任务 2**（可选）→ 根据实际情况决定是否需要统一提取逻辑

## Complements

### 1. 自动恢复云端存储模式
- **状态**：✅ 已完成
- **修改文件**：
  - `src/DesktopApp.tsx` — 添加 `useEffect`（第 39-44 行），监听 `user`/`authLoading` 状态，已登录时自动 `setStorageMode('cloud')`
  - `src/MobileApp.tsx` — 添加 `useEffect`（第 46-51 行），同上逻辑
- **审查结果**：✅ 审查通过 — 4 项验收标准全部满足
- **完成时间**：2026-07-07
