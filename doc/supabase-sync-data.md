# Supabase 数据同步 - 任务规划

## 1. 需求概述

1. 切换到云端模式时，自动将本地数据合并同步到 Supabase
2. 导入数据时，同时写入 Supabase（当前模式下）

## 2. 需求澄清记录

### Q1：切换到云端时的冲突处理
> **问题**：本地同步到云端时，云端已有数据怎么处理？
> - 覆盖云端数据
> - 合并数据（按 id 去重）
> - 先清空再上传
>
> **用户回答**：合并数据（本地覆盖云端同名记录，云端独有保留）

### Q2：导入数据时的冲突处理
> **问题**：导入时云端已有相同 id 的记录怎么处理？
> - 覆盖云端
> - 本地优先
> - 云端优先
>
> **用户回答**：覆盖云端（本地有则覆盖，云端独有保留）

## 3. 任务列表

### 任务 1：实现本地→云端合并同步

| 属性 | 值 |
|------|-----|
| **描述** | 在 `supabase.ts` 中新增 `syncLocalToCloud` 函数：读取本地 holdings + transactions，读取云端 holdings + transactions，按 code/id 合并（本地覆盖云端同名记录，云端独有保留），批量写入 Supabase。在 `SupabaseConfigDialog` 的「保存」按钮中，当切换到云端模式时调用此函数 |
| **涉及文件** | `src/services/supabase.ts`、`src/components/SupabaseConfigDialog.tsx` |
| **验收标准** | 本地有数据且云端有数据的场景，保存后云端包含两者合并结果 |

### 任务 2：导入数据时同步到云端

| 属性 | 值 |
|------|-----|
| **描述** | 修改 `dataMigration.ts` 的 `importData` 函数：当前为云端模式时，导入的数据合并写入 Supabase（本地覆盖云端同名记录）。需要新增 `importDataToSupabase` 辅助函数 |
| **涉及文件** | `src/services/dataMigration.ts`、`src/services/supabase.ts` |
| **验收标准** | 云端模式下导入 JSON 文件，数据写入 Supabase |

## 4. 执行顺序

```
任务 1 (切换同步) → 任务 2 (导入同步)
```

- **任务 1** 是核心，优先开发
- **任务 2** 依赖任务 1 的合并逻辑，可复用

## Complements

### 1. 本地→云端合并同步
- **状态**：✅ 已完成
- **修改文件**：
  - `src/services/supabase.ts` — 新增 syncLocalToCloud 函数，合并本地与云端数据后 upsert 到 Supabase
  - `src/components/SupabaseConfigDialog.tsx` — handleSave 在切换到云端模式时调用 syncLocalToCloud，显示同步中状态
- **审查结果**：审查通过
- **完成时间**：2026-07-04

### 2. 导入同步到云端
- **状态**：⏳ 审查中
- **修改文件**：
  - `src/services/dataMigration.ts` — importData 改为 async，云端模式下导入后调用 syncLocalToCloud
  - `src/components/HeaderStats.tsx` — handleImport 改为 await importData
- **审查结果**：审查进行中
- **完成时间**：2026-07-04
