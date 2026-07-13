# 收益走势计算修复 - 任务规划

## 1. 需求概述

基金详情页面的「收益走势」图表中的收益曲线显示不正确，工具提示（Tooltip）中显示的值全部为 0。

## 2. 需求澄清记录

### Q1：问题表现
> **问题**：你观察到的收益计算不正确具体是什么表现？
> 
> **用户回答**：鼠标滑动上去之后，提示框里面都是 0

### Q2：交易记录情况
> **问题**：这个基金持仓中有真实的交易记录吗？
> 
> **用户回答**：有真实交易记录

### Q3：问题根因确认
> **问题**：x 轴坐标只有 5 个，但 y 轴有几百个数据点？
> 
> **用户回答**：是的，问题出在 x 轴坐标上，计算出来的收益 x 轴只有 5 个，但 y 轴有几百个数

## 3. 问题分析

### 根因：xLabels 只返回 5 个标签，导致 ECharts 数据不匹配

`profitChartCalc.ts` 中的 `toXLabels` 函数用于生成 x 轴标签，但它固定只返回 **5 个**均匀分布的日期标签：

```javascript
function toXLabels(netWorths) {
  const count = Math.min(5, netWorths.length);
  const step = (netWorths.length - 1) / (count - 1);
  // 生成 5 个标签
}
```

这 5 个标签通过 `DailyProfitResult.xLabels` 传递给 `ProfitChart` 组件。在 `ProfitChart.tsx` 中，这 5 个标签被用作 ECharts `xAxis.type: 'category'` 的 `data`：

```javascript
xAxis: {
    type: 'category',
    data: dates,  // 只有 5 个
    ...
}
```

当 x 轴只有 5 个类别标签，但系列数据（`profits`）有几百个数据点时，ECharts **只展示了前 5 个数据点**。而前 5 个数据点对应的日期较早，还没有任何交易发生，因此 `cumShares = 0`、`cumInvested = 0`，**收益全部为 0**。

**对比**：`NavChart.tsx` 没有这个问题，因为它直接使用 `netWorths.map(r => r.date.slice(5))` 生成全量日期作为 x 轴数据。

## 4. 修复内容

### 修复：xLabels 改为返回全量日期

| 属性 | 值 |
|------|-----|
| **修改文件** | `src/utils/profitChartCalc.ts` |
| **修改内容** | 将 `calcDailyProfits` 中 `xLabels` 的生成从 `toXLabels(netWorths)` 改为 `netWorths.map((r) => r.date.slice(5))` |
| **效果** | xLabels 现在与 profits 数据点数量一致，ECharts 能正确渲染所有数据点。ECharts 会自动管理 x 轴标签密度，避免标签拥挤 |
| **额外清理** | 移除了不再使用的 `toXLabels` 函数 |

## 5. 验证方式

1. 打开基金详情页面，查看「收益走势」图表
2. 鼠标悬停在图表不同位置，工具提示应显示非零的收益数值
3. 切换时间范围（近6月/近1年/近3年/全部），各范围均应正常显示
4. 对比顶部概览卡片的「累计收益」「持仓收益」数值，应与走势图最后一个点一致