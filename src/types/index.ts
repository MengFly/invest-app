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
  // 持仓收益（仅当前持有份额的未实现盈亏）
  holdingProfit: number;
  holdingProfitRate: number;
  // 买入统计数据（用于加权平均成本计算）
  totalBuyCost: number;
  totalBuyShares: number;
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

// ===== 天天基金估算净值接口响应 =====

export interface EstimatedNavData {
  fundCode: string;
  name: string;
  navDate: string;           // jzrq - 最新公布净值日期
  nav: number;               // dwjz - 最新公布单位净值
  estimatedNav: number;      // gsz - 估算净值
  estimatedChange: number;   // gszzl - 估算涨跌幅（百分比）
  estimatedTime: string;     // gztime - 估算时间
}
