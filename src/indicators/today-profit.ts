import { registerIndicator } from './registry';
import { formatMoney, formatPercent } from '@/utils/format';
import { colors } from '@/theme';
import type { IndicatorDefinition } from '@/types';
import { mockContext } from './_mockContext';

const definition: IndicatorDefinition = {
  id: 'today-profit',
  name: '今日收益',
  desc: '当日持有的盈亏金额与涨跌幅',
  group: '收益指标',
  position: 'top',
  configSchema: [],
  defaultConfig: {},
  calculate(ctx, _config) {
    const { summary } = ctx;
    if (!summary) return null;
    const profit = summary.todayProfit;
    const color = profit > 0 ? colors.profit : profit < 0 ? colors.loss : colors.flat;
    return {
      position: 'top',
      value: {
        value: formatMoney(profit, true),
        sub: formatPercent(summary.todayChange),
        color,
      },
    };
  },
  preview() {
    return { ctx: mockContext, result: definition.calculate(mockContext, definition.defaultConfig)! };
  },
};

export default definition;
registerIndicator(definition);
