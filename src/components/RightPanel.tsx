import { BuyDialog } from '@/components/BuyDialog';
import { NavChart } from '@/components/chart/NavChart';
import { ProfitChart } from '@/components/chart/ProfitChart';
import { DividendDialog } from '@/components/DividendDialog';
import { EditTransactionDialog } from '@/components/EditTransactionDialog';
import { FundInfoDialog } from '@/components/FundInfoDialog';
import { IndicatorAnalysisDialog } from '@/components/IndicatorAnalysisDialog';
import { SellDialog } from '@/components/SellDialog';
import { Tooltip } from '@/components/ui/Tooltip';
import { useAppStore } from '@/hooks/useAppStore';
import { useEstimatedNav } from '@/hooks/useEstimatedNav';
import { useFundBasicInfo, useFundNetWorth } from '@/hooks/useFund';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useHoldingDetail, useTransactions } from '@/hooks/usePortfolio';
import { colors } from '@/theme';
import type { Transaction } from '@/types';
import { formatPercent } from '@/utils/format';
import { findNavByDate } from '@/utils/navUtils';
import { resolveWithNetWorths } from '@/utils/pendingNavResolver';
import type { DailyProfitResult } from '@/utils/profitChartCalc';
import { calcDailyProfits } from '@/utils/profitChartCalc';
import { isPendingTx } from '@/utils/transactionUtils';
import { Info } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type RangeKey = '6m' | '1y' | '3y' | 'all';

function formatMD(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[1]}-${parts[2]}`;
}

function MiniMetric({
  label,
  value,
  valueColor,
  badge,
  tooltip,
}: {
  label: string;
  value: string;
  valueColor?: string;
  badge?: string;
  tooltip?: string;
}) {
  const content = (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium tracking-wide" style={{ color: colors.textSecondary }}>
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className="text-lg font-bold leading-none tracking-tight"
          style={{ color: valueColor ?? colors.textPrimary, fontFamily: 'Geist Mono, monospace' }}
        >
          {value}
        </span>
        {badge && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm leading-none"
            style={{
              color: valueColor,
              backgroundColor: valueColor === colors.profit ? colors.profitBg : colors.lossBg,
              fontFamily: 'Geist Mono, monospace',
            }}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );

  if (tooltip) {
    return <Tooltip text={tooltip}>{content}</Tooltip>;
  }
  return content;
}

interface RightPanelProps {
  code: string | null;
}

export function RightPanel({ code }: RightPanelProps) {
  const [range, setRange] = usePersistedState<RangeKey>('right-panel:range', '1y');

  const [buyOpen, setBuyOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [dividendOpen, setDividendOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  // 净值走势曲线设置
  const [navSettingsOpen, setNavSettingsOpen] = useState(false);
  const [indicatorAnalysisOpen, setIndicatorAnalysisOpen] = useState(false);
  const [showHoldingCostLine, setShowHoldingCostLine] = usePersistedState('right-panel:showHoldingCostLine', true);
  const [showCumulativeCostLine, setShowCumulativeCostLine] = usePersistedState('right-panel:showCumulativeCostLine', true);
  const [showHoldingCostPolyline, setShowHoldingCostPolyline] = usePersistedState('right-panel:showHoldingCostPolyline', false);
  const [showCumulativeCostPolyline, setShowCumulativeCostPolyline] = usePersistedState('right-panel:showCumulativeCostPolyline', false);
  const [showTxDots, setShowTxDots] = usePersistedState('right-panel:showTxDots', true);
  const [zoomRange, setZoomRange] = useState({ start: 0, end: 100 });

  // 切换时间范围时重置缩放
  useEffect(() => {
    setZoomRange({ start: 0, end: 100 });
  }, [range]);

  const { triggerRefresh } = useAppStore();
  const { summary, loading: detailLoading, refresh: refreshDetail, transactions: detailTransactions } = useHoldingDetail(code ?? undefined);
  const { data: netWorths, loading, error, refresh: refreshNav } = useFundNetWorth(code ?? undefined);
  const { data: transactions, refresh: refreshTx } = useTransactions(code ?? undefined);
  const { data: basicInfo } = useFundBasicInfo(code ?? undefined);
  const { data: estimatedNavData } = useEstimatedNav(code ?? undefined);

  // 净值数据加载后，自动补全待确认交易
  useEffect(() => {
    if (code && netWorths && netWorths.length > 0) {
      resolveWithNetWorths(code, netWorths).then((n) => {
        if (n > 0) { refreshDetail(); refreshTx(); }
      });
    }
  }, [code, netWorths?.length]);

  const handleTransactionSuccess = useCallback(() => {
    refreshDetail();
    refreshTx();
    refreshNav();
    triggerRefresh();
  }, [refreshDetail, refreshTx, refreshNav, triggerRefresh]);

  const fundName = summary?.holding.name ?? code ?? '';

  // 交易记录按日期降序排列
  const sortedTransactions = useMemo(() => {
    if (!transactions) return [];
    return [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions]);

  const filteredNetWorths = useMemo(() => {
    if (!netWorths || netWorths.length === 0) return [];
    const now = new Date(netWorths[netWorths.length - 1].date);
    const cutoffMap: Record<RangeKey, number> = {
      '6m': 180,
      '1y': 365,
      '3y': 1095,
      'all': Infinity,
    };
    const cutoffDays = cutoffMap[range];
    if (cutoffDays === Infinity) return netWorths;
    const cutoffDate = new Date(now.getTime() - cutoffDays * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);
    const startIdx = netWorths.findIndex((r) => r.date >= cutoffStr);
    return startIdx > 0 ? netWorths.slice(startIdx) : netWorths;
  }, [netWorths, range]);

  const dailyProfit = useMemo<DailyProfitResult | null>(
    () => calcDailyProfits(filteredNetWorths, detailTransactions ?? []),
    [filteredNetWorths, detailTransactions]
  );

  const ranges: { key: RangeKey; label: string }[] = [
    { key: '6m', label: '近6月' },
    { key: '1y', label: '近1年' },
    { key: '3y', label: '近3年' },
    { key: 'all', label: '全部' },
  ];

  if (!code) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3" style={{ color: colors.textTertiary }}>
          <Info size={32} strokeWidth={1} />
          <span className="text-sm">请选择基金</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto min-h-0 scroll-smooth">
        <div className="px-5 pb-6 min-h-full flex flex-col">
          <div className="flex items-center h-11 border-b gap-2 shrink-0" style={{ borderColor: colors.borderLight }}>
            <button
              type="button"
              className="flex-1 text-sm font-semibold truncate tracking-tight text-left cursor-pointer hover:opacity-70"
              style={{ color: colors.textPrimary }}
              onClick={() => setInfoOpen(true)}
            >
              {fundName}
            </button>
            <span className="text-[10px] font-mono shrink-0" style={{ color: colors.textTertiary }}>
              {code}
            </span>
          </div>

          {/* 收益成本概览 */}
          {summary && (
            <div
              className="mt-4 rounded-xl border px-5 py-3 flex items-center gap-8"
              style={{ borderColor: colors.borderLight, backgroundColor: colors.bgCard }}
            >
              <MiniMetric
                label="持有金额"
                value={`¥${summary.holdAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
              <MiniMetric
                label="持有份额"
                value={`${summary.holdShares.toFixed(2)} 份`}
              />
              <MiniMetric
                label="持仓收益"
                value={
                  summary.holdingProfit >= 0
                    ? `+¥${summary.holdingProfit.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `-¥${Math.abs(summary.holdingProfit).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                }
                valueColor={summary.holdingProfit >= 0 ? colors.profit : colors.loss}
                badge={formatPercent(summary.holdingProfitRate)}
                tooltip="持仓收益 = 持有市值 - 持仓成本\\n= 持有份额 × 当前净值 - 加权平均买入价 × 持有份额\\n仅当前持有份额的未实现盈亏"
              />
              <MiniMetric
                label="持仓成本线"
                value={
                  summary.totalBuyShares > 0
                    ? `¥${(summary.totalBuyCost / summary.totalBuyShares).toFixed(4)}`
                    : '--'
                }
                tooltip="持仓成本线 = 总买入金额 ÷ 总买入份额\\n（加权平均买入单价，只计算买入交易的成本）"
              />
              <MiniMetric
                label="累计收益"
                value={
                  summary.totalProfit >= 0
                    ? `+¥${summary.totalProfit.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `-¥${Math.abs(summary.totalProfit).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                }
                valueColor={summary.totalProfit >= 0 ? colors.profit : colors.loss}
                badge={formatPercent(summary.totalProfitRate)}
                tooltip="累计收益 = 持有市值 - 净投入\\n= 持有份额 × 当前净值 - (总买入金额 - 总卖出金额)\\n包含已实现盈亏和未实现盈亏的总和"
              />
              <MiniMetric
                label="累计成本线"
                value={
                  summary.holdShares > 0
                    ? `¥${(summary.totalInvested / summary.holdShares).toFixed(4)}`
                    : '--'
                }
                tooltip="累计成本线 = 净投入 ÷ 持有份额\\n= (总买入金额 - 总卖出金额) ÷ 持有份额\\n（扣除卖出回收后的净成本单价）"
              />
              {summary.totalManagementFee > 0 && (
                <MiniMetric
                  label="累计管理费"
                  value={`¥${summary.totalManagementFee.toFixed(2)}`}
                  valueColor={colors.loss}
                  tooltip={`管理费 = 持有金额 × 年费率 ÷ 365 × 持有天数`}
                />
              )}
            </div>
          )}

          {detailLoading && !summary && (
            <div className="flex items-center justify-center py-8 mt-4">
              <span className="text-xs" style={{ color: colors.textTertiary }}>加载持仓数据...</span>
            </div>
          )}

          <div className="flex gap-3 mt-4 flex-1 min-h-[300px]">
            <div className="flex-1 flex flex-col gap-3">
              <div
                className="overflow-hidden rounded-xl border"
                style={{ borderColor: colors.borderLight, backgroundColor: colors.bgCard }}
              >
                <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold tracking-wide" style={{ color: colors.textPrimary }}>
                      净值走势
                    </span>
                    <div className="relative">
                    <button
                      type="button"
                      className="p-1.5 rounded-md cursor-pointer transition-all duration-150 hover:opacity-70"
                      style={{ color: navSettingsOpen ? colors.primary : colors.textTertiary }}
                      onClick={() => setNavSettingsOpen(!navSettingsOpen)}
                      title="曲线设置"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded-md cursor-pointer transition-all duration-150 hover:opacity-70"
                      style={{ color: colors.textTertiary }}
                      onClick={() => setIndicatorAnalysisOpen(true)}
                      title="指标分析"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                    </button>
                    {navSettingsOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setNavSettingsOpen(false)} />
                        <div
                          className="absolute left-0 top-full mt-1 z-50 rounded-xl border shadow-md py-2 min-w-[180px]"
                          style={{ backgroundColor: colors.bgCard, borderColor: colors.borderLight }}
                        >
                          <div className="px-3 pb-1.5 text-[10px] font-semibold tracking-wide" style={{ color: colors.textTertiary }}>
                            曲线显示
                          </div>
                          <label className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:opacity-70 text-sm" style={{ color: colors.textPrimary }}>
                            <input type="checkbox" checked={showHoldingCostLine} onChange={(e) => setShowHoldingCostLine(e.target.checked)} className="rounded" />
                            持仓成本线
                          </label>
                          <label className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:opacity-70 text-sm" style={{ color: colors.textPrimary }}>
                            <input type="checkbox" checked={showCumulativeCostLine} onChange={(e) => setShowCumulativeCostLine(e.target.checked)} className="rounded" />
                            累计成本线
                          </label>
                          <label className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:opacity-70 text-sm" style={{ color: colors.textPrimary }}>
                            <input type="checkbox" checked={showHoldingCostPolyline} onChange={(e) => setShowHoldingCostPolyline(e.target.checked)} className="rounded" />
                            持仓成本线走势
                          </label>
                          <label className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:opacity-70 text-sm" style={{ color: colors.textPrimary }}>
                            <input type="checkbox" checked={showCumulativeCostPolyline} onChange={(e) => setShowCumulativeCostPolyline(e.target.checked)} className="rounded" />
                            累计成本线走势
                          </label>
                          <div className="border-t my-1.5" style={{ borderColor: colors.borderLight }} />
                          <label className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:opacity-70 text-sm" style={{ color: colors.textPrimary }}>
                            <input type="checkbox" checked={showTxDots} onChange={(e) => setShowTxDots(e.target.checked)} className="rounded" />
                            交易标记
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                  </div>
                  <div className="flex gap-0.5 bg-gray-50 rounded-lg p-0.5">
                      {ranges.map((r) => (
                        <button
                          key={r.key}
                          type="button"
                          className="px-2.5 py-1 rounded-md text-[10px] font-medium cursor-pointer transition-all duration-150"
                          style={{
                            backgroundColor: range === r.key ? colors.bgCard : 'transparent',
                            color: range === r.key ? colors.primary : colors.textSecondary,
                            boxShadow: range === r.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                          }}
                          onClick={() => setRange(r.key)}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                <div className="px-2 pb-2">
                  {loading && !netWorths ? (
                    <div className="flex flex-col items-center py-8 gap-3">
                      <span className="text-xs" style={{ color: colors.textSecondary }}>加载中...</span>
                    </div>
                  ) : error && !netWorths ? (
                    <div className="flex flex-col items-center py-8 gap-3">
                      <span className="text-xs" style={{ color: colors.textSecondary }}>{error}</span>
                      <button
                        type="button"
                        className="px-4 py-2 rounded-md text-xs font-medium text-white cursor-pointer"
                        style={{ backgroundColor: colors.primary }}
                        onClick={refreshNav}
                      >
                        重试
                      </button>
                    </div>
                  ) : filteredNetWorths.length > 0 ? (
                    <div className="pt-1">
                      <NavChart
                        key={`nav-${range}`}
                        netWorths={filteredNetWorths}
                        transactions={transactions ?? []}
                        summary={summary ?? undefined}
                        showHoldingCostLine={showHoldingCostLine}
                        showCumulativeCostLine={showCumulativeCostLine}
                        showHoldingCostPolyline={showHoldingCostPolyline}
                        showCumulativeCostPolyline={showCumulativeCostPolyline}
                        showTxDots={showTxDots}
                        height={220}
                        estimatedNav={estimatedNavData?.estimatedNav}
                        estimatedTime={estimatedNavData?.estimatedTime}
                        dataZoomStart={zoomRange.start}
                        dataZoomEnd={zoomRange.end}
                        onZoomChange={(start, end) => setZoomRange({ start, end })}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <span className="text-xs" style={{ color: colors.textSecondary }}>暂无净值数据</span>
                    </div>
                  )}
                </div>
              </div>

              <div
                className="overflow-hidden rounded-xl border"
                style={{ borderColor: colors.borderLight, backgroundColor: colors.bgCard }}
              >
                <div className="px-4 pt-3.5 pb-2">
                  <span className="text-[11px] font-semibold tracking-wide" style={{ color: colors.textPrimary }}>
                    收益走势
                  </span>
                </div>
                {!summary || !dailyProfit ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="text-xs" style={{ color: colors.textSecondary }}>
                      暂无持仓数据，无法计算收益走势
                    </span>
                  </div>
                ) : (
                  <div className="pb-2">
                    <ProfitChart
                      key={`profit-${range}`}
                      profits={dailyProfit.profits}
                      endLabel={dailyProfit.endLabel}
                      xLabels={dailyProfit.xLabels}
                      holdingProfits={dailyProfit.holdingProfits}
                      height={220}
                      dataZoomStart={zoomRange.start}
                      dataZoomEnd={zoomRange.end}
                      onZoomChange={(start, end) => setZoomRange({ start, end })}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="w-[400px] shrink-0">
              <div
                className="overflow-hidden rounded-xl border h-full flex flex-col"
                style={{ borderColor: colors.borderLight, backgroundColor: colors.bgCard }}
              >
                <div className="flex items-center justify-between px-4 pt-3.5 pb-2 shrink-0">
                  <span className="text-[11px] font-semibold tracking-wide" style={{ color: colors.textPrimary }}>
                    交易记录
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="rounded-full px-3 py-1 text-[10px] font-semibold text-white cursor-pointer transition-all duration-150 active:scale-[0.97]"
                      style={{ backgroundColor: colors.primary }}
                      onClick={() => setBuyOpen(true)}
                    >
                      加仓
                    </button>
                    <button
                      type="button"
                      className="rounded-full px-3 py-1 text-[10px] font-semibold cursor-pointer transition-all duration-150 active:scale-[0.97]"
                      style={{ backgroundColor: colors.lossBg, color: colors.loss }}
                      onClick={() => setSellOpen(true)}
                    >
                      减仓
                    </button>
                    <button
                      type="button"
                      className="rounded-full px-3 py-1 text-[10px] font-semibold cursor-pointer transition-all duration-150 active:scale-[0.97]"
                      style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}
                      onClick={() => setDividendOpen(true)}
                    >
                      分红
                    </button>
                  </div>
                </div>

                <div
                  className="flex items-center px-4 py-2 text-[10px] font-medium uppercase tracking-wider shrink-0"
                  style={{ borderBottomWidth: 1, borderBottomColor: colors.borderLight, color: colors.textTertiary }}
                >
                  <span className="flex-1">日期</span>
                  <span className="w-[44px] text-center">类型</span>
                  <span className="w-[70px] text-center">净值</span>
                  <span className="w-[52px] text-center">涨跌</span>
                  <span className="w-[76px] text-right">金额</span>
                  <span className="w-[64px] text-right">份额</span>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[420px]">
                  {!transactions || sortedTransactions.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-xs" style={{ color: colors.textSecondary }}>暂无交易记录</span>
                    </div>
                  ) : (
                    sortedTransactions.map((tx, i) => {
                      const navRec = findNavByDate(netWorths ?? [], tx.date);
                      const nav = navRec?.netWorth ?? 0;
                      const change = navRec ? navRec.netWorthChange / 100 : 0;
                      const changeColor = change >= 0 ? colors.primary : colors.loss;
                      const isBuy = tx.type === 'buy';
                      const isDividend = tx.type === 'dividend';
                      const typeColor = isDividend ? '#16A34A' : (isBuy ? colors.profit : colors.loss);
                      const typeText = isDividend ? '分红' : (isBuy ? '买入' : '卖出');
                      const sign = isDividend ? '+' : (isBuy ? '+' : '-');
                      return (
                        <div
                          key={tx.id}
                          className="flex items-center px-4 py-2.5 transition-colors hover:bg-gray-50 cursor-pointer"
                          onClick={() => setEditTx(tx)}
                          style={{
                            opacity: isPendingTx(tx) ? 0.6 : 1,
                            ...(i < sortedTransactions.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.borderLight } : {}),
                          }}
                          title={isPendingTx(tx) ? '净值待确认，确认后将自动更新' : undefined}
                        >
                          <span className="flex-1 text-[12px] font-mono shrink-0" style={{ color: colors.textPrimary }}>
                            {formatMD(tx.date)}
                            {isPendingTx(tx) && (
                              <span className="ml-1 text-[9px] font-semibold" style={{ color: colors.loss }}>待确认</span>
                            )}
                          </span>
                          <span className="w-[44px] text-center text-[11px] font-semibold shrink-0" style={{ color: typeColor }}>
                            {typeText}
                          </span>
                          <span className="w-[70px] text-center text-[12px] font-medium font-mono shrink-0" style={{ color: colors.textPrimary }}>
                            {nav > 0 ? nav.toFixed(4) : '--'}
                          </span>
                          <span className="w-[52px] text-center text-[12px] font-medium font-mono shrink-0" style={{ color: navRec ? changeColor : colors.textTertiary }}>
                            {navRec ? formatPercent(change) : '--'}
                          </span>
                          <span className="w-[76px] text-right text-[12px] font-mono shrink-0" style={{ color: colors.textPrimary }}>
                            <span className="font-medium">{sign}¥{tx.amount.toFixed(2)}</span>
                            {tx.fee > 0 && (
                              <span className="block text-[9px] leading-none mt-px" style={{ color: colors.textTertiary }}>
                                手续费 ¥{tx.fee.toFixed(2)}
                              </span>
                            )}
                          </span>
                          <span className="w-[64px] text-right text-[11px] font-mono shrink-0" style={{ color: colors.textTertiary }}>
                            {tx.shares.toFixed(2)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BuyDialog
        open={buyOpen}
        onOpenChange={setBuyOpen}
        fundCode={code}
        fundName={fundName}
        netWorths={netWorths ?? []}
        basicInfo={basicInfo}
        onSuccess={handleTransactionSuccess}
      />
      <SellDialog
        open={sellOpen}
        onOpenChange={setSellOpen}
        fundCode={code}
        fundName={fundName}
        summary={summary}
        netWorths={netWorths ?? []}
        basicInfo={basicInfo}
        transactions={transactions ?? []}
        onSuccess={handleTransactionSuccess}
      />
      <DividendDialog
        open={dividendOpen}
        onOpenChange={setDividendOpen}
        fundCode={code}
        fundName={fundName}
        netWorths={netWorths ?? []}
        onSuccess={handleTransactionSuccess}
      />
      <FundInfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        basicInfo={basicInfo}
      />
      {editTx && (
        <EditTransactionDialog
          open={!!editTx}
          onOpenChange={(o) => { if (!o) setEditTx(null); }}
          transaction={editTx}
          netWorths={netWorths ?? []}
          onSuccess={handleTransactionSuccess}
        />
      )}
      <IndicatorAnalysisDialog
        open={indicatorAnalysisOpen}
        onOpenChange={setIndicatorAnalysisOpen}
        netWorths={netWorths ?? []}
        transactions={transactions ?? undefined}
        code={code}
        estimatedNav={estimatedNavData?.estimatedNav}
        estimatedTime={estimatedNavData?.estimatedTime}
      />
    </div>
  );
}
