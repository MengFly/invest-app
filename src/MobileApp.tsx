import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/hooks/useAppStore';
import { useHoldings } from '@/hooks/usePortfolio';
import { useAllSummaries } from '@/hooks/useAllSummaries';
import { useAllEstimatedNavs } from '@/hooks/useEstimatedNav';
import { calcEstimatedProfit, calcTotalEstimatedProfit } from '@/utils/estimatedProfit';
import { AddFundDialog } from '@/components/AddFundDialog';
import { SupabaseConfigDialog } from '@/components/SupabaseConfigDialog';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { colors } from '@/theme';
import { formatMoney, formatPercent } from '@/utils/format';
import MobileDetail from './MobileDetail';

export default function MobileApp() {
  const { code } = useParams();

  if (code) {
    return <MobileDetail code={code} />;
  }

  return <MobileList />;
}

function MobileList() {
  const navigate = useNavigate();
  const { triggerRefresh, refreshTrigger } = useAppStore();
  const { holdings } = useHoldings(refreshTrigger);
  const { summaries } = useAllSummaries(refreshTrigger);

  const codes = useMemo(() => holdings.map((h) => h.code), [holdings]);
  const estimatedNavs = useAllEstimatedNavs(codes);

  const [addFundOpen, setAddFundOpen] = useState(false);
  const [supabaseConfigOpen, setSupabaseConfigOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState<string | null>(null);

  const handleRefresh = () => triggerRefresh();

  const summaryList = Object.values(summaries);
  const totalAssets = summaryList.reduce((s, x) => s + x.holdAmount, 0);
  const totalProfit = summaryList.reduce((s, x) => s + x.totalProfit, 0);
  const totalInvested = summaryList.reduce((s, x) => s + x.totalInvested, 0);

  const totalEstimatedProfit = useMemo(() => {
    const items = holdings
      .map((h) => ({
        holdAmount: summaries[h.code]?.holdAmount ?? 0,
        estimatedChange: estimatedNavs[h.code]?.estimatedChange ?? 0,
        estimatedTime: estimatedNavs[h.code]?.estimatedTime ?? '',
      }))
      .filter((item) => item.estimatedTime);
    return items.length > 0 ? calcTotalEstimatedProfit(items) : null;
  }, [holdings, summaries, estimatedNavs]);

  const estProfitRate = totalEstimatedProfit !== null && totalAssets > 0
    ? totalEstimatedProfit / totalAssets
    : null;

  const deleteFund = deleteCode ? holdings.find((h) => h.code === deleteCode) : null;

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: colors.bg }}>
      {/* 顶部总览 */}
      <div className="shrink-0 px-4 pt-4 pb-2">
        <div
          className="rounded-xl px-4 py-3"
          style={{
            background: 'linear-gradient(135deg, #FAFAFA 0%, #FDF0F0 100%)',
            border: `1px solid ${colors.borderLight}`,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium tracking-wide" style={{ color: colors.textSecondary }}>
              总资产
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg px-2.5 py-1 text-[10px] font-medium cursor-pointer"
                style={{ backgroundColor: colors.bgInput, color: colors.textSecondary }}
                onClick={() => setSupabaseConfigOpen(true)}
              >
                同步
              </button>
              <button
                type="button"
                className="rounded-lg px-2.5 py-1 text-[10px] font-medium cursor-pointer"
                style={{ backgroundColor: colors.bgInput, color: colors.textSecondary }}
                onClick={() => setAddFundOpen(true)}
              >
                添加
              </button>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-2xl font-bold tracking-tight"
              style={{ color: colors.textPrimary, fontFamily: 'Geist Mono, monospace' }}
            >
              ¥{totalAssets.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {totalEstimatedProfit !== null ? (
              <>
                <span className="text-sm font-semibold font-mono leading-none" style={{ color: totalEstimatedProfit >= 0 ? colors.profit : colors.loss }}>
                  {formatMoney(totalEstimatedProfit, true)}
                </span>
                <span className="text-[10px] font-mono leading-none" style={{ color: totalEstimatedProfit >= 0 ? colors.profit : colors.loss }}>
                  ({formatPercent(estProfitRate!)})
                </span>
              </>
            ) : (
              <span className="text-[10px] font-mono" style={{ color: colors.textTertiary }}>--</span>
            )}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px]" style={{ color: colors.textTertiary }}>
              {summaryList.length > 0
                ? `累计收益: ${totalProfit >= 0 ? '+' : ''}${formatMoney(totalProfit)}`
                : '暂无持仓'}
            </span>
            <span className="text-[10px]" style={{ color: colors.textTertiary }}>
              共 {holdings.length} 只
            </span>
          </div>
        </div>
      </div>

      {/* 基金列表 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 scroll-smooth">
        <div className="flex flex-col gap-2">
          {holdings.map((holding) => {
            const summary = summaries[holding.code];
            if (!summary) {
              return (
                <div
                  key={holding.code}
                  className="flex items-center justify-center rounded-xl p-4"
                  style={{ backgroundColor: colors.bgCard, minHeight: 80 }}
                >
                  <div className="h-4 w-4 animate-pulse rounded-full" style={{ backgroundColor: colors.textTertiary }} />
                </div>
              );
            }

            const todayChange = summary.todayChange;
            const todayStr = new Date().toISOString().slice(0, 10);
            const estNav = estimatedNavs[holding.code];
            const hasEstimate = estNav && estNav.estimatedTime?.slice(0, 10) === todayStr;
            const displayChange = hasEstimate ? (estNav!.estimatedChange / 100) : todayChange;
            const displayLabel = hasEstimate ? '今日' : (summary.navDate ? summary.navDate.slice(5) : '昨收');
            const displayColor = displayChange >= 0 ? colors.profit : colors.loss;

            return (
              <button
                key={holding.code}
                type="button"
                className="w-full cursor-pointer text-left outline-none"
                onClick={() => navigate(`/mobile/${holding.code}`)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setDeleteCode(holding.code);
                }}
              >
                <div
                  className="rounded-xl border px-4 py-3.5 transition-all duration-150"
                  style={{
                    borderColor: 'transparent',
                    backgroundColor: colors.bgCard,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate leading-5" style={{ color: colors.textPrimary }}>
                        {summary.holding.name}
                      </div>
                      <div className="text-[10px] font-mono mt-px" style={{ color: colors.textTertiary }}>
                        {summary.holding.code}
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-sm font-semibold font-mono" style={{ color: colors.textPrimary }}>
                        ¥{summary.holdAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4">
                      <div>
                        <div className="text-[10px]" style={{ color: colors.textTertiary }}>{displayLabel}</div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-semibold font-mono leading-5" style={{ color: displayColor }}>
                            {formatPercent(displayChange)}
                          </span>
                          {hasEstimate && (() => {
                            const ep = calcEstimatedProfit(summary.holdAmount, estNav!.estimatedChange, estNav!.estimatedTime);
                            return ep !== null ? (
                              <span className="text-[10px] font-mono leading-5" style={{ color: ep >= 0 ? colors.profit : colors.loss }}>
                                {formatMoney(ep, true)}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px]" style={{ color: colors.textTertiary }}>收益</div>
                        <div className="text-xs font-semibold font-mono leading-5" style={{ color: summary.totalProfit >= 0 ? colors.profit : colors.loss }}>
                          {formatMoney(summary.totalProfit, true)}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px]" style={{ color: colors.textTertiary }}>
                      {summary.holdDays} 天
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {holdings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <span className="text-sm" style={{ color: colors.textTertiary }}>暂无持仓基金</span>
              <button
                type="button"
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-white cursor-pointer"
                style={{ backgroundColor: colors.primary }}
                onClick={() => setAddFundOpen(true)}
              >
                添加第一只基金
              </button>
            </div>
          )}
        </div>
      </div>

      <AddFundDialog
        open={addFundOpen}
        onOpenChange={setAddFundOpen}
        onSuccess={handleRefresh}
      />
      <SupabaseConfigDialog
        open={supabaseConfigOpen}
        onOpenChange={setSupabaseConfigOpen}
        onConfigChange={handleRefresh}
      />
      {deleteFund && (
        <DeleteConfirmDialog
          open={!!deleteCode}
          onOpenChange={(open) => { if (!open) setDeleteCode(null); }}
          fundCode={deleteFund.code}
          fundName={deleteFund.name}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}