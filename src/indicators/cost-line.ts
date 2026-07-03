import { registerIndicator } from './registry';
import { colors } from '@/theme';
import type { IndicatorDefinition, LayerDescriptor } from '@/types';
import { mockContext } from './_mockContext';

const COST_STROKE = colors.secondary;

const definition: IndicatorDefinition = {
  id: 'cost-line',
  name: '成本线',
  desc: '在净值图上叠加成本价参考线，支持当前成本横线与历史成本变化折线',
  group: '持仓指标',
  position: 'navChart',
  configSchema: [
    { key: 'showHline', label: '显示当前成本横线', type: 'boolean', default: true },
    { key: 'showPolyline', label: '显示历史成本变化折线', type: 'boolean', default: false },
  ],
  defaultConfig: { showHline: true, showPolyline: false },
  calculate(ctx, config) {
    const { summary, netWorths, transactions } = ctx;
    if (!summary || summary.holdShares <= 0) return null;

    const layers: LayerDescriptor[] = [];
    const showHline = config.showHline !== false;
    const showPolyline = config.showPolyline === true;

    if (showHline) {
      const costNav = summary.totalInvested / summary.holdShares;
      layers.push({
        kind: 'hline',
        y: costNav,
        label: `成本 ${costNav.toFixed(4)}`,
        stroke: COST_STROKE,
      });
    }

    if (showPolyline && netWorths.length > 0) {
      const sortedTxns = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
      let cumShares = 0;
      let cumInvested = 0;
      let txnIdx = 0;
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < netWorths.length; i++) {
        const date = netWorths[i].date;
        while (txnIdx < sortedTxns.length && sortedTxns[txnIdx].date <= date) {
          const t = sortedTxns[txnIdx];
          if (t.type === 'buy') {
            cumShares += t.shares;
            cumInvested += t.amount;
          } else {
            cumShares -= t.shares;
            cumInvested -= t.amount;
          }
          txnIdx++;
        }
        if (cumShares > 0) {
          points.push({ x: i, y: cumInvested / cumShares });
        }
      }
      if (points.length >= 2) {
        layers.push({ kind: 'polyline', points, stroke: COST_STROKE });
      }
    }

    if (layers.length === 0) return null;
    return { position: 'navChart', layers };
  },
  preview() {
    return { ctx: mockContext, result: definition.calculate(mockContext, definition.defaultConfig)! };
  },
};

export default definition;
registerIndicator(definition);
