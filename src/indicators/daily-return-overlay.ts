import { registerIndicator } from './registry';
import { colors } from '@/theme';
import type { IndicatorDefinition, LayerDescriptor } from '@/types';
import { mockContext } from './_mockContext';

const definition: IndicatorDefinition = {
  id: 'daily-return-overlay',
  name: '日收益率',
  desc: '在净值图上叠加近 N 日每日收益率走势（归一化到净值范围）',
  group: '收益指标',
  position: 'navChart',
  configSchema: [
    { key: 'days', label: '计算周期(天)', type: 'number', min: 1, max: 30, step: 1, default: 1 },
  ],
  defaultConfig: { days: 1 },
  calculate(ctx, config) {
    const { netWorths } = ctx;
    if (netWorths.length < 2) return null;

    const days = Math.max(1, Math.min(30, Number(config.days) || 1));
    if (netWorths.length < days + 1) return null;

    const returns: { x: number; rate: number }[] = [];
    for (let i = days; i < netWorths.length; i++) {
      const prev = netWorths[i - days].netWorth;
      const curr = netWorths[i].netWorth;
      if (prev > 0) {
        returns.push({ x: i, rate: (curr - prev) / prev });
      }
    }
    if (returns.length === 0) return null;

    const navs = netWorths.map((n) => n.netWorth);
    const minNav = Math.min(...navs);
    const maxNav = Math.max(...navs);
    const rates = returns.map((r) => r.rate);
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);
    const rangeRate = maxRate - minRate || 1;

    const points = returns.map((r) => ({
      x: r.x,
      y: minNav + ((r.rate - minRate) / rangeRate) * (maxNav - minNav),
    }));

    const layers: LayerDescriptor[] = [
      { kind: 'polyline', points, stroke: colors.secondary },
    ];
    return { position: 'navChart', layers };
  },
  preview() {
    return { ctx: mockContext, result: definition.calculate(mockContext, definition.defaultConfig)! };
  },
};

export default definition;
registerIndicator(definition);
