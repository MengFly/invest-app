import { registerIndicator } from './registry';
import { formatMoney } from '@/utils/format';
import type { IndicatorDefinition } from '@/types';
import { mockContext } from './_mockContext';

const definition: IndicatorDefinition = {
  id: 'hold-amount',
  name: '持有金额',
  desc: '当前持有市值',
  group: '持仓指标',
  position: 'top',
  configSchema: [],
  defaultConfig: {},
  calculate(ctx, _config) {
    const { summary } = ctx;
    if (!summary) return null;
    return {
      position: 'top',
      value: {
        value: formatMoney(summary.holdAmount),
        sub: '元',
      },
    };
  },
  preview() {
    return { ctx: mockContext, result: definition.calculate(mockContext, definition.defaultConfig)! };
  },
};

export default definition;
registerIndicator(definition);
