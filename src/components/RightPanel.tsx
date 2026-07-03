import { useState, useMemo } from 'react';
import { colors } from '@/theme';
import { formatPercent } from '@/utils/format';
import { useHoldingDetail, useTransactions } from '@/hooks/usePortfolio';
import { useFundNetWorth, useFundBasicInfo } from '@/hooks/useFund';
import { useIndicatorResults } from '@/hooks/useIndicatorResults';
import { TopIndicatorGrid } from '@/components/TopIndicatorGrid';
import { NavChart } from '@/components/chart/NavChart';
import { ProfitChart } from '@/components/chart/ProfitChart';
import { OverlayRenderer } from '@/components/chart/OverlayRenderer';
import { BuyDialog } from '@/components/BuyDialog';
import { SellDialog } from '@/components/SellDialog';
import { FundInfoDialog } from '@/components/FundInfoDialog';
import { IndicatorConfigDialog } from '@/components/IndicatorConfigDialog';
import { calcDailyProfits } from '@/utils/profitChartCalc';
import { Info, Settings, Plus, Minus } from 'lucide-react';
import type { IndicatorContext } from '@/types';
import type { DailyProfitResult } from '@/utils/profitChartCalc';

type RangeKey = '6m' | '1y' | '3y' | 'all';

function formatMD(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[1]}-${parts[2]}`;
}

interface RightPanelProps {
  code: string | null;
}

export function RightPanel({ code }: RightPanelProps) {
  const [range, setRange] = useState<RangeKey>('1y');

  const [buyOpen, setBuyOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const { summary, loading: detailLoading } = useHoldingDetail(code ?? undefined);
  const { data: netWorths, loading, error, refresh } = useFundNetWorth(code ?? undefined);
  const { data: transactions } = useTransactions(code ?? undefined);
  const { data: basicInfo } = useFundBasicInfo(code ?? undefined);

  const fundName = summary?.holding.name ?? code ?? '';
  const navList = useMemo(() => (netWorths ? [...netWorths].reverse() : []), [netWorths]);

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

  const indicatorCtx: IndicatorContext = useMemo(
    () => ({
      code: code ?? '',
      netWorths: filteredNetWorths,
      transactions: transactions ?? [],
      summary,
      basicInfo,
      range,
    }),
    [code, filteredNetWorths, transactions, summary, basicInfo, range]
  );

  const { topResults, navChartLayers, profitChartLayers, loading: indicatorsLoading } = useIndicatorResults(indicatorCtx);

  const dailyProfit = useMemo<DailyProfitResult | null>(
    () => calcDailyProfits(filteredNetWorths, transactions ?? []),
    [filteredNetWorths, transactions]
  );

  const ranges: { key: RangeKey; label: string }[] = [
    { key: '6m', label: '近6月' },
    { key: '1y', label: '近1年' },
    { key: '3y', label: '近3年' },
    { key: 'all', label: '全部' },
  ];

  const latestNav = useMemo(() => {
    if (netWorths && netWorths.length > 0) return netWorths[netWorths.length - 1].netWorth;
    return summary?.latestNav ?? 0;
  }, [netWorths, summary]);

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
    <div className="h-full">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="px-5 pb-6">
          <div className="flex items-center h-11 border-b gap-2" style={{ borderColor: colors.borderLight }}>
            <span className="text-sm font-semibold truncate tracking-tight" style={{ color: colors.textPrimary }}>
              {fundName}
            </span>
            <span className="text-[10px] font-mono shrink-0" style={{ color: colors.textTertiary }}>
              {code}
            </span>
          </div>

          {detailLoading && !summary ? (
            <div className="flex items-center justify-center py-8 mt-4">
              <span className="text-xs" style={{ color: colors.textTertiary }}>加载持仓数据...</span>
            </div>
          ) : !summary ? (
            <div className="flex flex-col items-center justify-center py-6 mt-4 gap-3" style={{ color: colors.textTertiary }}>
              <Info size={16} strokeWidth={1} />
              <span className="text-xs">未建仓，无法显示持仓收益</span>
            </div>
          ) : indicatorsLoading ? (
            <div className="flex items-center justify-center py-8 mt-4">
              <span className="text-xs" style={{ color: colors.textTertiary }}>加载指标...</span>
            </div>
          ) : topResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 mt-4 gap-3" style={{ color: colors.textTertiary }}>
              <Info size={16} strokeWidth={1} />
              <span className="text-xs">暂无启用的指标，请到指标配置开启</span>
            </div>
          ) : (
            <div className="mt-4">
              <TopIndicatorGrid results={topResults} />
            </div>
          )}

          <div
            className="mt-4 overflow-hidden rounded-xl border"
            style={{ borderColor: colors.borderLight, backgroundColor: colors.bgCard }}
          >
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
              <span className="text-[11px] font-semibold tracking-wide" style={{ color: colors.textPrimary }}>
                净值走势
              </span>
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
                    onClick={refresh}
                  >
                    重试
                  </button>
                </div>
              ) : filteredNetWorths.length > 0 ? (
                <div className="pt-1">
                  <NavChart
                    netWorths={filteredNetWorths}
                    overlay={(coords) => <OverlayRenderer layers={navChartLayers} coords={coords} />}
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
            className="mt-3 overflow-hidden rounded-xl border"
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
                  points={dailyProfit.points}
                  dataRange={dailyProfit.dataRange}
                  endLabel={dailyProfit.endLabel}
                  yLabels={dailyProfit.yLabels}
                  xLabels={dailyProfit.xLabels}
                  overlay={(coords) => <OverlayRenderer layers={profitChartLayers} coords={coords} />}
                />
              </div>
            )}
          </div>

          <div
            className="mt-3 overflow-hidden rounded-xl border"
            style={{ borderColor: colors.borderLight, backgroundColor: colors.bgCard }}
          >
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
              <span className="text-[11px] font-semibold tracking-wide" style={{ color: colors.textPrimary }}>
                每日净值
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
              </div>
            </div>

            <div
              className="flex items-center px-4 py-2 text-[10px] font-medium uppercase tracking-wider"
              style={{ borderBottomWidth: 1, borderBottomColor: colors.borderLight, color: colors.textTertiary }}
            >
              <span className="flex-1">日期</span>
              <span className="w-[76px] text-center">净值</span>
              <span className="w-[64px] text-center">涨跌</span>
              <span className="w-[48px] text-right">持仓</span>
            </div>

            {loading && !netWorths ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-xs" style={{ color: colors.textSecondary }}>加载中...</span>
              </div>
            ) : error && !netWorths ? (
              <div className="flex flex-col items-center py-8 gap-3">
                <span className="text-xs" style={{ color: colors.textSecondary }}>{error}</span>
                <button
                  type="button"
                  className="px-4 py-2 rounded-md text-xs font-medium text-white cursor-pointer"
                  style={{ backgroundColor: colors.primary }}
                  onClick={refresh}
                >
                  重试
                </button>
              </div>
            ) : navList.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-xs" style={{ color: colors.textSecondary }}>暂无净值数据</span>
              </div>
            ) : (
              navList.map((rec, i) => {
                const change = rec.netWorthChange / 100;
                const changeColor = change >= 0 ? colors.primary : colors.loss;
                return (
                  <div
                    key={rec.date}
                    className="flex items-center px-4 py-2.5 transition-colors hover:bg-gray-50"
                    style={
                      i < navList.length - 1
                        ? { borderBottomWidth: 1, borderBottomColor: colors.borderLight }
                        : undefined
                    }
                  >
                    <span className="flex-1 text-[12px] font-mono" style={{ color: colors.textPrimary }}>
                      {formatMD(rec.date)}
                    </span>
                    <span className="w-[76px] text-center text-[12px] font-medium font-mono" style={{ color: colors.textPrimary }}>
                      {rec.netWorth.toFixed(4)}
                    </span>
                    <span className="w-[64px] text-center text-[12px] font-medium font-mono" style={{ color: changeColor }}>
                      {formatPercent(change)}
                    </span>
                    <span className="w-[48px] text-right text-[10px] font-mono" style={{ color: colors.textTertiary }}>
                      --
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 flex gap-2 flex-wrap">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white cursor-pointer transition-all duration-150 active:scale-[0.97]"
              style={{ backgroundColor: colors.primary }}
              onClick={() => setBuyOpen(true)}
            >
              <Plus size={13} strokeWidth={2} />
              加仓
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold cursor-pointer transition-all duration-150 active:scale-[0.97]"
              style={{ backgroundColor: colors.lossBg, color: colors.loss }}
              onClick={() => setSellOpen(true)}
            >
              <Minus size={13} strokeWidth={2} />
              减仓
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium cursor-pointer transition-all duration-150 active:scale-[0.97]"
              style={{ backgroundColor: colors.bgInput, color: colors.textSecondary }}
              onClick={() => setInfoOpen(true)}
            >
              <Info size={13} strokeWidth={1.5} />
              基金信息
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium cursor-pointer transition-all duration-150 active:scale-[0.97]"
              style={{ backgroundColor: colors.bgInput, color: colors.textSecondary }}
              onClick={() => setConfigOpen(true)}
            >
              <Settings size={13} strokeWidth={1.5} />
              指标配置
            </button>
          </div>
        </div>
      </div>

      <BuyDialog
        open={buyOpen}
        onOpenChange={setBuyOpen}
        fundCode={code}
        fundName={fundName}
        latestNav={latestNav}
        onSuccess={() => {}}
      />
      <SellDialog
        open={sellOpen}
        onOpenChange={setSellOpen}
        fundCode={code}
        fundName={fundName}
        summary={summary}
        onSuccess={() => {}}
      />
      <FundInfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        basicInfo={basicInfo}
      />
      <IndicatorConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        fundCode={code}
      />
    </div>
  );
}
