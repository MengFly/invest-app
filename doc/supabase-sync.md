# Supabase 多端同步 - 任务规划

## 1. 需求概述

接入 Supabase 作为云存储后端，实现持仓数据在多个设备之间的自动同步。用户可在两种存储模式间切换：**本地存储**（现有的 localStorage）和 **云存储**（Supabase）。

## 2. 需求澄清记录

### Q1：排序字段的处理
> **问题**：order 数据放在哪里？
> - 放到 fund_holdings 表的某个字段
> - 单独一张表
> - 不需要同步排序
>
> **用户回答**：order 放到了 fund_holdings 表的 `order` 字段中

### Q2：localStorage 的处理方式
> **问题**：接入 Supabase 后 localStorage 怎么处理？
> - 保留 localStorage 作为本地缓存
> - 完全替换 localStorage
>
> **用户回答**：让用户选择使用本地存储还是 Supabase，两种方案可切换

### Q3：配置入口
> **问题**：Supabase 配置入口放在哪里？
> - Header 上的设置按钮
> - 单独的配置弹窗
>
> **用户回答**：加一个单独的配置弹窗

## 3. 涉及的数据表

### fund_holdings
| 字段 | 类型 | 说明 |
|------|------|------|
| code | text (PK) | 基金代码 |
| name | text | 基金名称 |
| addedAt | bigint | 添加时间戳 |
| order | int | 排序位置 |

### fund_transactions
| 字段 | 类型 | 说明 |
|------|------|------|
| id | text (PK) | 交易记录 ID |
| fundCode | text | 基金代码 |
| type | text | buy / sell |
| date | text | 交易日 |
| amount | double | 金额 |
| shares | double | 份额 |
| fee | double | 手续费 |
| note | text | 备注（可空） |
| createdAt | bigint | 创建时间戳 |

## 4. 任务列表

### 任务 1：创建 Supabase 配置弹窗

| 属性 | 值 |
|------|-----|
| **描述** | 新增 `SupabaseConfigDialog` 组件，包含：URL 输入框、anon key 输入框、连接测试按钮、存储模式切换（本地/云端）、保存到 localStorage。点击连接测试时调用 Supabase API 验证凭据有效性 |
| **涉及文件** | `src/components/SupabaseConfigDialog.tsx`（新建） |
| **验收标准** | 输入正确的 URL 和 key 能验证通过，错误时提示失败；选择「云端」模式后所有数据读写走 Supabase |

### 任务 2：创建 Supabase 服务层

| 属性 | 值 |
|------|-----|
| **描述** | 新建 `src/services/supabase.ts`，封装：初始化 Supabase 客户端（从 localStorage 读取 URL 和 key）、fund_holdings 的 CRUD（查全部/插入/更新/删除）、fund_transactions 的 CRUD（按基金查/新增/更新/删除）、同步排序 order 字段 |
| **涉及文件** | `src/services/supabase.ts`（新建） |
| **验收标准** | 各 CRUD 方法能正确读写 Supabase 表，返回数据结构与现有类型一致 |

### 任务 3：存储模式切换与数据流改造

| 属性 | 值 |
|------|-----|
| **描述** | 创建 `useStorageMode` hook，管理当前存储模式（local/cloud）并持久化到 localStorage。修改 `portfolio.ts` 和 `transaction.ts` 服务：根据当前模式决定读写 localStorage 还是调用 Supabase。两个模式的切换入口在配置弹窗中 |
| **涉及文件** | `src/hooks/useStorageMode.ts`（新建）、`src/services/portfolio.ts`（改造）、`src/services/transaction.ts`（改造） |
| **验收标准** | 切换到云端后数据自动从 Supabase 读取，写入操作写入 Supabase；切换回本地后仍使用 localStorage |

### 任务 4：接入 Header 配置入口

| 属性 | 值 |
|------|-----|
| **描述** | 在 Header 或页面合适位置添加配置入口按钮（如齿轮图标），点击打开 `SupabaseConfigDialog`。在 Header 上显示当前存储模式状态标识 |
| **涉及文件** | `src/components/HeaderStats.tsx`、`src/App.tsx` |
| **验收标准** | 页面有一个入口能打开 Supabase 配置弹窗，弹窗关闭后模式切换生效 |

## 5. 执行顺序

```
任务 1 (配置弹窗) → 任务 2 (Supabase 服务层) → 任务 3 (模式切换) → 任务 4 (入口接入)
```

- **任务 1 和任务 2** 可以并行开发
- **任务 3** 依赖任务 2 完成
- **任务 4** 依赖任务 1 完成
