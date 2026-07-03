import { registerIndicator } from './registry';
import { formatMoney, formatPercent } from '@/utils/format';
import { colors } from '@/theme';
import type { IndicatorDefinition } from '@/types';
import { mockContext } from './_mockContext';

const definition: IndicatorDefinition = {
  id: 'hold-profit',
  name: '持有收益',
  desc: '累计持有期间的盈亏金额与收益率',
  group: '收益指标',
  position: 'top',
  configSchema: [],
  defaultConfig: {},
  calculate(ctx, _config) {
    const { summary } = ctx;
    if (!summary) return null;
    const profit = summary.totalProfit;
    const color = profit > 0 ? colors.profit : profit < 0 ? colors.loss : colors.flat;
    return {
      position: 'top',
      value: {
        value: formatMoney(profit, true),
        sub: formatPercent(summary.totalProfitRate),
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
