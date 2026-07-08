# 移动端分红录入 - 任务规划

## 1. 需求概述

为移动端基金详情页（`MobileDetail.tsx`）添加分红录入功能，使用户能在移动端像桌面端一样录入基金分红数据。

## 2. 需求澄清记录

| 问题 | 确认结果 |
|------|----------|
| 双端现状确认 | **补上移动端**：桌面端（RightPanel）已有分红按钮和 DividendDialog 组件，移动端（MobileDetail）缺少分红按钮，需要补上 |
| 组件复用方式 | **完全复用原组件**：移动端直接复用现有的 `DividendDialog` 组件，与桌面端保持一致 |
| 分红类型显示 | **需要显示为"分红"**：在交易列表中，`type='dividend'` 的记录应显示为"分红"，颜色为绿色（#16A34A） |

## 3. 任务列表

### 任务 1：移动端添加分红录入按钮 + 分红类型显示

| 属性 | 值 |
|------|-----|
| **描述** | 在 `MobileDetail.tsx` 中添加分红录入按钮和 `DividendDialog` 组件，并修复交易列表中分红类型的显示 |
| **依赖关系** | 无 |
| **验收标准** | 1. 移动端详情页顶部导航栏出现"分红"按钮（绿色风格，与桌面端一致）<br>2. 点击"分红"按钮弹出 DividendDialog 录入弹窗<br>3. 提交分红数据后数据正确写入 Supabase<br>4. 交易列表中分红记录显示为"分红"（绿色文字），而非归入"卖出"类别 |

**具体修改清单：**

1. **添加 Import**：引入 `DividendDialog` 组件
2. **添加 State**：`const [dividendOpen, setDividendOpen] = useState(false);`
3. **添加分红按钮**：在顶部导航栏的"减仓"按钮后面添加一个绿色风格的分红按钮
4. **修复类型显示**：参照桌面端（RightPanel.tsx 第475-478行），增加 `isDividend` 判断逻辑
5. **渲染 DividendDialog**：在 BuyDialog / SellDialog 同级位置添加 DividendDialog 实例

## 4. 执行顺序

单一任务，不存在多任务依赖，直接实施。

## Complements

### 1. 移动端添加分红录入按钮 + 分红类型显示
- **状态**：✅ 已完成
- **修改文件**：
  - `src/MobileDetail.tsx` — 5 处改动：
    1. 添加 `DividendDialog` 导入
    2. 添加 `dividendOpen` 状态变量
    3. 顶部导航栏添加绿色"分红"按钮
    4. 修复交易列表分红类型显示（显示为绿色"分红"文字）
    5. 底部渲染 `DividendDialog` 组件实例
- **完成时间**：2026-07-08

### 桌面端参考代码

桌面端分红按钮（RightPanel.tsx 第440-447行）：
```tsx
<button
  type="button"
  className="rounded-full px-3 py-1 text-[10px] font-semibold cursor-pointer transition-all duration-150 active:scale-[0.97]"
  style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}
  onClick={() => setDividendOpen(true)}
>
  分红
</button>
```

桌面端交易类型显示（RightPanel.tsx 第475-478行）：
```tsx
const isDividend = tx.type === 'dividend';
const typeColor = isDividend ? '#16A34A' : (isBuy ? colors.profit : colors.loss);
const typeText = isDividend ? '分红' : (isBuy ? '买入' : '卖出');
const sign = isDividend ? '+' : (isBuy ? '+' : '-');
```
