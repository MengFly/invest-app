// 基金核心类型

export interface Fund {
  id: string;
  code: string;
  name: string;
  type: string;
  manager: string;
  establishedDate: string;
  latestNav: number;
  navDate: string;
  estimatedNav: number;
  estimatedChange: number;
  holdAmount: number;
  holdShares: number;
  totalInvested: number;
  holdDays: number;
  totalProfit: number;
  totalProfitRate: number;
  todayProfit: number;
  todayChange: number;
  sparkline: number[];
  sparklineUp: boolean;
}

export interface NavRecord {
  date: string;
  fullDate: string;
  nav: number;
  change: number;
  holdChange: number | null;
}

export type IndicatorGroup = '收益指标' | '风险指标' | '持仓指标' | '基金指标';

export interface Indicator {
  id: string;
  name: string;
  desc: string;
  group: IndicatorGroup;
  added: boolean;
  displayPosition?: 'top' | 'overlay';
  calcPeriod?: 'hold' | '1y' | '3y';
}

// ===== 持仓与交易记录 (本地存储) =====

export interface Holding {
  code: string;
  name: string;
  addedAt: number;
}

export interface Transaction {
  id: string;
  fundCode: string;
  type: 'buy' | 'sell';
  date: string;
  amount: number;
  shares: number;
  fee: number;
  note?: string;
  createdAt: number;
}

export interface HoldingSummary {
  holding: Holding;
  holdShares: number;
  totalInvested: number;
  holdAmount: number;
  totalProfit: number;
  totalProfitRate: number;
  todayChange: number;
  todayProfit: number;
  holdDays: number;
  latestNav: number;
  navDate: string;
  sparkline: number[];
  sparklineUp: boolean;
}

// ===== 真实接口响应类型 =====

export interface FundListItem {
  code: string;
  name: string;
}

export interface BuyRule {
  minAmount: number;
  maxAmount: number;
  value: number;
}

export interface ManagementFee {
  name: string;
  value: number;
}

export interface SellRule {
  dayStart: number;
  dayEnd: number | null;
  value: number;
}

export interface FundBasicInfo {
  fundCode: string;
  fundName: string;
  fundType: string;
  company: string;
  manager: string;
  buyRules: BuyRule[];
  managementFees: ManagementFee[];
  sellRules: SellRule[];
}

export interface NetWorthRecord {
  date: string;
  netWorth: number;
  netWorthChange: number;
}

// ===== 指标系统核心类型 =====

export type IndicatorPosition = 'top' | 'navChart' | 'profitChart';

export type ConfigFieldType = 'boolean' | 'enum' | 'number';

export interface ConfigField {
  key: string;
  label: string;
  type: ConfigFieldType;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  step?: number;
  default: boolean | string | number;
}

export type IndicatorConfig = Record<string, boolean | string | number>;

export type LayerDescriptor =
  | { kind: 'hline'; y: number; label?: string; stroke?: string; dash?: number[] }
  | { kind: 'vline'; x: number; label?: string; stroke?: string; dash?: number[] }
  | { kind: 'polyline'; points: { x: number; y: number }[]; stroke?: string; fill?: string }
  | { kind: 'area'; points: { x: number; y: number }[]; fill: string }
  | { kind: 'point'; x: number; y: number; r?: number; fill: string }
  | { kind: 'endLabel'; x: number; y: number; text: string; bg?: string; color?: string }
  | { kind: 'text'; x: number; y: number; text: string; color?: string; anchor?: 'start' | 'middle' | 'end' };

export interface ValueResult {
  value: string;
  sub?: string;
  color?: string;
}

export type IndicatorResult =
  | { position: 'top'; value: ValueResult }
  | { position: 'navChart' | 'profitChart'; layers: LayerDescriptor[] };

export interface IndicatorContext {
  code: string;
  netWorths: NetWorthRecord[];
  transactions: Transaction[];
  summary: HoldingSummary | null;
  basicInfo: FundBasicInfo | null;
  range: '6m' | '1y' | '3y' | 'all';
}

export interface ChartCoords {
  width: number;
  height: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
  chartW: number;
  chartH: number;
  toX: (i: number) => number;
  toY: (v: number) => number;
  dataToY: (value: number) => number;
  dataRange: { min: number; max: number };
}

export interface IndicatorDefinition {
  id: string;
  name: string;
  desc: string;
  group: '收益指标' | '风险指标' | '持仓指标' | '基金指标';
  position: IndicatorPosition;
  configSchema: ConfigField[];
  defaultConfig: IndicatorConfig;
  calculate(ctx: IndicatorContext, config: IndicatorConfig): IndicatorResult | null;
  preview(): { ctx: IndicatorContext; result: IndicatorResult };
}

export interface IndicatorState {
  enabled: boolean;
  config: IndicatorConfig;
  topOrder?: number;
}

export type IndicatorConfigMap = Record<string, IndicatorState>;
