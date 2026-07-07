# Supabase Auth + RLS 适配改造 - 任务规划

## Requirements

### 1. 创建带 Auth 的 Supabase 客户端
创建静态初始化的 Supabase 客户端，替换当前的 `createClientFromConfig()` 模式。客户端使用硬编码的 URL 和 AnonKey，启用 Session 持久化（`persistSession: true`）。用户登录后 SDK 自动在请求头附加 JWT，无需手动处理 Token。

验收标准：
- 删除 `createClientFromConfig()`、`getSupabaseConfig()`、`saveSupabaseConfig()`、`clearSupabaseConfig()` 等旧函数
- 新增 `getClient()` 返回静态创建的 Supabase 客户端实例
- SDK 自动从 localStorage 恢复 Session，刷新页面后无需重新登录

### 2. 实现邮箱密码登录/注册功能
创建登录弹窗组件 `AuthDialog`，包含邮箱+密码的登录和注册功能。使用 Supabase Auth 的 `signInWithPassword()` 和 `signUp()`。登录成功后自动关闭弹窗。需处理常见错误（邮箱已注册、密码错误、网络超时等）。

验收标准：
- 输入邮箱密码可登录已有账号
- 注册新账号并自动登录
- 错误提示友好（中文）
- 登录成功后 Dialog 自动关闭
- 页面刷新后保持登录状态

### 3. 导出当前登录用户 Hook
创建 `useAuth` Hook，提供 `user`、`session`、`loading`、`signIn()`、`signUp()`、`signOut()` 等状态和方法。供全局判断登录状态使用。

验收标准：
- 全局可获取当前用户状态
- 登录/登出时状态同步更新
- 页面初始化时自动检测已有 Session

### 4. 更新 Supabase CRUD 操作适配 RLS
审查 `supabase.ts` 中所有 `fund_holdings` 和 `fund_transactions` 的查询，确保它们与 RLS 策略兼容。由于 RLS 使用 `auth.uid()` 默认值和自动过滤：
- 所有 INSERT 不再需要传 `u_id` 字段（数据库自动填充）
- 所有 SELECT/UPDATE/DELETE 自动通过 `auth.uid()` 过滤，查询中不应手动加 `u_id` 条件
- `syncLocalToCloud()` 中的 upsert 逻辑需要验证与 RLS 的兼容性

验收标准：
- 所有 CRUD 操作在已登录状态下正常工作
- 未登录时执行云端操作应报错而非静默失败
- RLS 确保用户 A 查不到用户 B 的数据

### 5. 移除 SupabaseConfigDialog 及相关逻辑
删除 SupabaseConfigDialog 组件，移除 `getStorageMode()`/`setStorageMode()` 的 localStorage 读写（改为纯运行时状态），删除 `testConnection()` 函数。DesktopApp 和 MobileApp 中移除对 SupabaseConfigDialog 的引用。

验收标准：
- 编译无报错，原配置弹窗不再出现

### 6. 改造 DesktopApp 和 MobileApp 的同步按钮
将 Header 和 MobileApp 顶部的「同步」按钮改为「登录」按钮：
- 未登录时显示「登录」按钮，点击弹出 AuthDialog
- 已登录时显示用户邮箱简写 + 「退出」按钮
- 登录后自动触发 `syncLocalToCloud()` 将本地数据合并到云端
- `storageMode` 改为根据登录状态自动切换（登录=cloud，未登录=local）

验收标准：
- 按钮文案随登录状态动态切换
- 登录后自动同步本地数据到云端
- 退出后自动切回本地模式，不再发起云端请求

### 7. 清理旧 localStorage 缓存项
登录成功后，清理原有的 Supabase 配置缓存（`supabase:config`、`supabase:cache:*` 等），避免旧数据残留。放在 `syncLocalToCloud()` 执行完毕后的清理步骤中。

验收标准：
- 登录同步后，localStorage 中不再有 `supabase:config` 和过期的云缓存项

### 8. 验证与测试
端到端验证完整流程：
- 新用户注册 → 自动登录 → 首次数据写入 Supabase
- 已有用户登录 → 加载云端数据
- 登出 → 切回本地模式
- 再次登录 → 合并本地新数据到云端
- 验证 RLS 隔离：另一个浏览器登录不同账号，不应看到本账号数据

验收标准：
- 所有验证场景通过

## 1. 需求概述

将 Supabase 从「手动输入 URL + AnonKey」的模式改为「硬编码 URL/AnonKey + 用户邮箱密码登录」，适配已启用的 RLS 策略（持仓表 `fund_holdings`、交易表 `fund_transactions` 均含 `u_id` 字段，只能查询和修改自己的数据）。

> **⚠️ 前提条件**：Supabase 表的 `u_id` 列必须有 `DEFAULT auth.uid()`，否则 RLS 策略会拒绝写入（插入时 `u_id` 为 NULL，RLS 检查 `auth.uid() = u_id` 永远为 false）。
> ```sql
> ALTER TABLE fund_transactions ALTER COLUMN u_id SET DEFAULT auth.uid();
> ALTER TABLE fund_holdings ALTER COLUMN u_id SET DEFAULT auth.uid();
> ```

## 2. 需求澄清记录

| 问题 | 确认结果 |
|------|---------|
| 登录方式 | **邮箱+密码**（Supabase Auth 内置支持） |
| u_id 填充方式 | **RLS 默认值** `auth.uid()`，应用代码不传 u_id，数据库自动处理 |
| 原 SupabaseConfigDialog 处理 | **完全移除**，改为登录弹窗 |
| URL 和 AnonKey | 硬编码到代码中，用户无需手动配置 |

## 3. 改造前后对比

| 维度 | 改造前 | 改造后 |
|------|--------|--------|
| Supabase 凭据 | 用户手动输入 URL + AnonKey，存 localStorage | 代码硬编码，开箱即用 |
| 认证方式 | 无（`auth: { persistSession: false }`） | 邮箱密码登录，Session 持久化 |
| 数据隔离 | 无（所有请求使用同一个 anon 角色） | RLS 按 `auth.uid()` 自动过滤 |
| 配置界面 | SupabaseConfigDialog（URL/Key 输入框） | 登录弹窗（邮箱+密码） |
| 存储模式 | local / cloud 双模式手动切换 | local（离线/未登录） + cloud（已登录）自动降级 |

## 4. 任务列表

### 任务 1：创建带 Auth 的 Supabase 客户端

| 属性 | 值 |
|------|-----|
| **描述** | 创建静态初始化的 Supabase 客户端，替换当前的 `createClientFromConfig()` 模式。客户端使用硬编码的 URL 和 AnonKey，启用 Session 持久化（`persistSession: true`）。用户登录后 SDK 自动在请求头附加 JWT，无需手动处理 Token。 |
| **依赖关系** | 无 |
| **验收标准** | 1. 删除 `createClientFromConfig()`、`getSupabaseConfig()`、`saveSupabaseConfig()`、`clearSupabaseConfig()` 等旧函数<br>2. 新增 `getClient()` 返回静态创建的 Supabase 客户端实例<br>3. SDK 自动从 localStorage 恢复 Session，刷新页面后无需重新登录 |

### 任务 2：实现邮箱密码登录/注册功能

| 属性 | 值 |
|------|-----|
| **描述** | 创建登录弹窗组件 `AuthDialog`，包含邮箱+密码的登录和注册功能。使用 Supabase Auth 的 `signInWithPassword()` 和 `signUp()`。登录成功后自动关闭弹窗。需处理常见错误（邮箱已注册、密码错误、网络超时等）。 |
| **依赖关系** | 任务 1 |
| **验收标准** | 1. 输入邮箱密码可登录已有账号<br>2. 注册新账号并自动登录<br>3. 错误提示友好（中文）<br>4. 登录成功后 Dialog 自动关闭<br>5. 页面刷新后保持登录状态 |

### 任务 3：导出当前登录用户 Hook

| 属性 | 值 |
|------|-----|
| **描述** | 创建 `useAuth` Hook（或直接在 supabase.ts 中导出 `onAuthStateChange` 监听），提供 `user`、`session`、`loading`、`signIn()`、`signUp()`、`signOut()` 等状态和方法。供全局判断登录状态使用。 |
| **依赖关系** | 任务 1 |
| **验收标准** | 1. 全局可获取当前用户状态<br>2. 登录/登出时状态同步更新<br>3. 页面初始化时自动检测已有 Session |

### 任务 4：更新 Supabase CRUD 操作适配 RLS

| 属性 | 值 |
|------|-----|
| **描述** | 审查 `supabase.ts` 中所有 `fund_holdings` 和 `fund_transactions` 的查询，确保它们与 RLS 策略兼容。由于 RLS 使用 `auth.uid()` 默认值和自动过滤，需要注意：<br>1. 所有 INSERT 不再需要传 `u_id` 字段（数据库自动填充）<br>2. 所有 SELECT/UPDATE/DELETE 自动通过 `auth.uid()` 过滤，查询中不应手动加 `u_id` 条件<br>3. `syncLocalToCloud()` 中的 upsert 逻辑需要验证与 RLS 的兼容性（本地用户数据上传到自己的账户下） |
| **依赖关系** | 任务 1 |
| **验收标准** | 1. 所有 CRUD 操作在已登录状态下正常工作<br>2. 未登录时执行云端操作应报错而非静默失败<br>3. RLS 确保用户 A 查不到用户 B 的数据 |

### 任务 5：移除 SupabaseConfigDialog 及相关逻辑

| 属性 | 值 |
|------|-----|
| **描述** | 1. 删除 `SupabaseConfigDialog.tsx` 组件文件<br>2. 删除 `getStorageMode()`、`setStorageMode()` 中的 localStorage 读写（存储模式改为纯运行时状态）<br>3. 删除 `testConnection()` 函数<br>4. `DesktopApp.tsx` 和 `MobileApp.tsx` 中移除对 `SupabaseConfigDialog` 的引用 |
| **依赖关系** | 任务 1 |
| **验收标准** | 编译无报错，原配置弹窗不再出现 |

### 任务 6：改造 DesktopApp 和 MobileApp 的同步按钮

| 属性 | 值 |
|------|-----|
| **描述** | 将 Header 和 MobileApp 顶部的「同步」按钮改为「登录」按钮：<br>1. 未登录时显示「登录」按钮，点击弹出 `AuthDialog`<br>2. 已登录时显示用户邮箱简写 + 「退出」按钮<br>3. 登录后自动触发 `syncLocalToCloud()` 将本地数据合并到云端<br>4. `storageMode` 改为根据登录状态自动切换（登录=cloud，未登录=local） |
| **依赖关系** | 任务 2、任务 3、任务 5 |
| **验收标准** | 1. 按钮文案随登录状态动态切换<br>2. 登录后自动同步本地数据到云端<br>3. 退出后自动切回本地模式，不再发起云端请求 |

### 任务 7：清理旧 localStorage 缓存项

| 属性 | 值 |
|------|-----|
| **描述** | 登录成功后，清理原有的 Supabase 配置缓存（`supabase:config`、`supabase:cache:*` 等），避免旧数据残留。可放在 `syncLocalToCloud()` 执行完毕后的清理步骤中。 |
| **依赖关系** | 任务 4 |
| **验收标准** | 登录同步后，localStorage 中不再有 `supabase:config` 和过期的云缓存项 |

### 任务 8：验证与测试

| 属性 | 值 |
|------|-----|
| **描述** | 端到端验证完整流程：<br>1. 新用户注册 → 自动登录 → 首次数据写入 Supabase<br>2. 已有用户登录 → 加载云端数据<br>3. 登出 → 切回本地模式<br>4. 再次登录 → 合并本地新数据到云端<br>5. 验证 RLS 隔离：另一个浏览器登录不同账号，不应看到本账号数据 |
| **依赖关系** | 任务 6、任务 7 |
| **验收标准** | 所有验证场景通过 |

## 5. 执行顺序

```
任务 1 (Supabase 客户端) ──→ 任务 2 (登录弹窗) ──→ 任务 3 (useAuth Hook)
                                │                       │
                                │                       ▼
                                └──────────→ 任务 4 (CRUD 适配 RLS)
                                                │
                                                ▼
                                    任务 5 (移除旧配置)
                                    任务 6 (改造同步按钮) ← ─ 任务 3
                                                │
                                                ▼
                                    任务 7 (清理缓存)
                                                │
                                                ▼
                                    任务 8 (验证测试)
```

**建议执行方式**：任务 1→3→4→5 可以串行紧密开发（都是 supabase.ts 内部改造），完成后统一编译验证。任务 2 的 UI 可以独立开发。任务 6 是最后集成步骤。

## Complements

### 1. 创建带 Auth 的 Supabase 客户端
- **状态**：✅ 已完成
- **修改文件**：
  - `src/services/supabase.ts` — 添加硬编码 SUPABASE_URL 和 SUPABASE_ANON_KEY，新增静态 `getClient()` 函数（单例），启用 `persistSession` 和 `autoRefreshToken`
- **审查结果**：✅ 通过
- **完成时间**：2026-07-07

### 2. 实现邮箱密码登录/注册功能
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/AuthDialog.tsx` — 新建 AuthDialog 组件，支持登录/注册模式切换，使用 Supabase Auth 的 `signInWithPassword` 和 `signUp`，中文错误提示，登录成功后自动关闭
- **审查结果**：✅ 通过
- **完成时间**：2026-07-07

### 3. 导出当前登录用户 Hook
- **状态**：✅ 已完成
- **修改文件**：
  - `src/hooks/useAuth.ts` — 新建 useAuth Hook，提供 user/session/loading/signIn/signUp/signOut，使用 onAuthStateChange 监听登录状态变化，初始化时 getSession 恢复已有 Session
- **审查结果**：✅ 通过
- **完成时间**：2026-07-07

### 4. 更新 Supabase CRUD 操作适配 RLS
- **状态**：✅ 已完成
- **修改文件**：
  - `src/services/supabase.ts` — 所有 CRUD 函数从 `createClientFromConfig()` 改为 `getClient()`，删除 `createClientFromConfig()` 函数；syncLocalToCloud 同样适配
- **审查结果**：✅ 通过
- **完成时间**：2026-07-07

### 5. 移除 SupabaseConfigDialog 及相关逻辑
- **状态**：✅ 已完成
- **修改文件**：
  - `src/components/SupabaseConfigDialog.tsx` — 已删除
  - `src/services/supabase.ts` — getStorageMode/setStorageMode 改为运行时变量，删除 testConnection() 和 createClientFromConfig()
  - `src/DesktopApp.tsx` — 移除 SupabaseConfigDialog 引用和 onOpenSupabaseConfig prop
  - `src/MobileApp.tsx` — 移除 SupabaseConfigDialog 引用和同步按钮
  - `src/components/HeaderStats.tsx` — onOpenSupabaseConfig 保留为可选 prop
- **审查结果**：✅ 通过
- **完成时间**：2026-07-07

### 6. 改造 DesktopApp 和 MobileApp 的同步按钮
- **状态**：✅ 已完成
- **修改文件**：
  - `src/DesktopApp.tsx` — 集成 useAuth 和 AuthDialog，登录后自动 syncLocalToCloud + 设置 storageMode=cloud，退出后设置 local
  - `src/components/HeaderStats.tsx` — 替换 onOpenSupabaseConfig 为 user/authLoading/onLogin/onLogout props，显示登录/退出按钮
  - `src/MobileApp.tsx` — 集成 useAuth 和 AuthDialog，顶部添加登录/退出按钮
- **审查结果**：✅ 通过
- **完成时间**：2026-07-07

### 7. 清理旧 localStorage 缓存项
- **状态**：✅ 已完成
- **修改文件**：
  - `src/services/supabase.ts` — 添加 clearOldConfig() 函数清理旧的 supabase:config 和 storage:mode
  - `src/DesktopApp.tsx` — 登录成功后调用 clearOldConfig()
  - `src/MobileApp.tsx` — 登录成功后调用 clearOldConfig()
- **完成时间**：2026-07-07

### 8. 验证与测试
- **状态**：⏳ 待验证
- **说明**：端到端验证需要用户参与，涉及登录注册、数据同步、RLS 隔离等完整流程
- **完成时间**：—
