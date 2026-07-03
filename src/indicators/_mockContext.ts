import { summarizeHolding } from '@/utils/holdingCalc';
import type { IndicatorContext, Holding, Transaction, NetWorthRecord, FundBasicInfo } from '@/types';

const mockHolding: Holding = {
  code: '005827',
  name: '易方达蓝筹精选混合',
  addedAt: Date.now() - 10 * 86400000,
};

const mockTransactions: Transaction[] = [
  { id: 't1', fundCode: '005827', type: 'buy', date: '2026-06-20', amount: 10000, shares: 4149.31, fee: 0, createdAt: Date.now() - 10 * 86400000 },
  { id: 't2', fundCode: '005827', type: 'buy', date: '2026-06-24', amount: 10000, shares: 4109.84, fee: 0, createdAt: Date.now() - 6 * 86400000 },
  { id: 't3', fundCode: '005827', type: 'buy', date: '2026-06-27', amount: 5000, shares: 2048.84, fee: 0, createdAt: Date.now() - 3 * 86400000 },
];

export const mockNetWorths: NetWorthRecord[] = [
  { date: '2026-06-20', netWorth: 2.4103, netWorthChange: -0.28 },
  { date: '2026-06-21', netWorth: 2.4211, netWorthChange: 0.45 },
  { date: '2026-06-22', netWorth: 2.4167, netWorthChange: -0.18 },
  { date: '2026-06-23', netWorth: 2.4386, netWorthChange: 0.91 },
  { date: '2026-06-24', netWorth: 2.4332, netWorthChange: -0.22 },
  { date: '2026-06-25', netWorth: 2.4368, netWorthChange: 0.15 },
  { date: '2026-06-26', netWorth: 2.4241, netWorthChange: -0.52 },
  { date: '2026-06-27', netWorth: 2.4406, netWorthChange: 0.68 },
  { date: '2026-06-28', netWorth: 2.4320, netWorthChange: -0.35 },
  { date: '2026-06-29', netWorth: 2.4568, netWorthChange: 1.02 },
];

const mockBasicInfo: FundBasicInfo = {
  fundCode: '005827',
  fundName: '易方达蓝筹精选混合',
  fundType: '混合型-偏股',
  company: '易方达基金管理有限公司',
  manager: '张坤',
  buyRules: [],
  managementFees: [],
  sellRules: [],
};

const mockSummary = summarizeHolding(mockHolding, mockTransactions, mockNetWorths);

export const mockContext: IndicatorContext = {
  code: '005827',
  netWorths: mockNetWorths,
  transactions: mockTransactions,
  summary: mockSummary,
  basicInfo: mockBasicInfo,
  range: '1y',
};
