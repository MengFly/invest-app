import { registerIndicator } from './registry';
import { formatMoney, formatPercent } from '@/utils/format';
import { colors } from '@/theme';
import type { IndicatorDefinition, LayerDescriptor } from '@/types';
import { mockContext } from './_mockContext';

const definition: IndicatorDefinition = {
  id: 'profit-end-label',
  name: '持仓收益端点标签',
  desc: '在收益曲线末点标注持仓收益金额或收益率',
  group: '收益指标',
  position: 'profitChart',
  configSchema: [
    {
      key: 'mode',
      label: '标注模式',
      type: 'enum',
      options: [
        { label: '收益金额', value: 'amount' },
        { label: '收益率', value: 'percent' },
      ],
      default: 'amount',
    },
  ],
  defaultConfig: { mode: 'amount' },
  calculate(ctx, config) {
    const { summary, netWorths } = ctx;
    if (!summary || netWorths.length === 0) return null;

    const mode = config.mode === 'percent' ? 'percent' : 'amount';
    const lastIndex = netWorths.length - 1;
    const profit = summary.totalProfit;
    const bg = profit > 0 ? colors.profit : profit < 0 ? colors.loss : colors.flat;
    const text = mode === 'amount' ? formatMoney(profit, true) : formatPercent(summary.totalProfitRate);

    const layers: LayerDescriptor[] = [
      {
        kind: 'endLabel',
        x: lastIndex,
        y: profit,
        text,
        bg,
      },
    ];
    return { position: 'profitChart', layers };
  },
  preview() {
    return { ctx: mockContext, result: definition.calculate(mockContext, definition.defaultConfig)! };
  },
};

export default definition;
registerIndicator(definition);
