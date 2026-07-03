import { useRef, useCallback } from 'react';
import { colors } from '@/theme';
import { formatMoney, formatPercent } from '@/utils/format';
import { Plus } from 'lucide-react';
import type { Holding, HoldingSummary } from '@/types';

interface LeftPanelProps {
  holdings: Holding[];
  summaries: Record<string, HoldingSummary>;
  selectedCode: string | null;
  onSelect: (code: string) => void;
  onAddFund: () => void;
  onDelete?: (code: string) => void;
}

export function LeftPanel({ holdings, summaries, selectedCode, onSelect, onAddFund, onDelete }: LeftPanelProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const handleMouseDown = useCallback((code: string) => {
    if (!onDelete) return;
    isLongPressRef.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPressRef.current = true;
      onDelete(code);
    }, 500);
  }, [onDelete]);

  const handleMouseUpOrLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback((code: string) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    onSelect(code);
  }, [onSelect]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-3 pb-3">
        <span className="text-base font-semibold tracking-tight" style={{ color: colors.textPrimary }}>
          我的持仓
        </span>
        {holdings.length > 0 && (
          <span className="text-[11px] font-mono font-medium" style={{ color: colors.textTertiary }}>
            {holdings.length} 只
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 scroll-smooth">
        <div className="flex flex-col gap-2 pb-3">
          {holdings.map((holding) => {
            const summary = summaries[holding.code];
            if (!summary) {
              return (
                <div
                  key={holding.code}
                  className="flex items-center justify-center rounded-xl p-4"
                  style={{ backgroundColor: colors.bg, minHeight: 80 }}
                >
                  <div className="h-4 w-4 animate-pulse rounded-full" style={{ backgroundColor: colors.textTertiary }} />
                </div>
              );
            }

            const isSelected = selectedCode === holding.code;
            const todayChange = summary.todayChange;
            const profitColor = summary.totalProfit >= 0 ? colors.profit : colors.loss;
            const todayColor = todayChange >= 0 ? colors.profit : colors.loss;
            const sparklinePoints = summary.sparkline;
            const hasSparkline = sparklinePoints.length >= 2;

            return (
              <button
                key={holding.code}
                type="button"
                className="w-full cursor-pointer text-left outline-none"
                onClick={() => handleClick(holding.code)}
                onMouseDown={() => handleMouseDown(holding.code)}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
              >
                <div
                  className="rounded-xl border px-3 py-3.5 transition-all duration-150"
                  style={{
                    borderColor: isSelected ? colors.profit : 'transparent',
                    backgroundColor: isSelected ? colors.bg : colors.bgCard,
                    boxShadow: isSelected
                      ? `0 0 0 1px ${colors.profitBg}`
                      : '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  <div className="flex items-stretch gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-sm font-semibold truncate leading-5"
                            style={{ color: colors.textPrimary }}
                          >
                            {summary.holding.name}
                          </div>
                          <div className="text-[10px] font-mono mt-px" style={{ color: colors.textTertiary }}>
                            {summary.holding.code}
                          </div>
                        </div>
                        <div className="ml-2 shrink-0 self-start">
                          {hasSparkline ? (
                            <SparklineMini points={sparklinePoints} />
                          ) : (
                            <div
                              className="rounded"
                              style={{ width: 64, height: 28, backgroundColor: colors.bgInput }}
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px]" style={{ color: colors.textTertiary }}>持有</div>
                          <div
                            className="text-sm font-semibold font-mono leading-5"
                            style={{ color: colors.textPrimary }}
                          >
                            ¥{summary.holdAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px]" style={{ color: colors.textTertiary }}>今日</div>
                          <div
                            className="text-xs font-semibold font-mono leading-5"
                            style={{ color: todayColor }}
                          >
                            {formatPercent(todayChange)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px]" style={{ color: colors.textTertiary }}>收益</div>
                          <div
                            className="text-xs font-semibold font-mono leading-5"
                            style={{ color: profitColor }}
                          >
                            {formatMoney(summary.totalProfit, true)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-3 border-t" style={{ borderColor: colors.borderLight }}>
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-sm font-medium transition-all duration-150 hover:opacity-70 active:scale-[0.98]"
          style={{
            borderColor: colors.border,
            color: colors.textSecondary,
          }}
          onClick={onAddFund}
        >
          <Plus size={15} strokeWidth={1.5} />
          添加基金
        </button>
      </div>
    </div>
  );
}

function SparklineMini({ points }: { points: number[] }) {
  const width = 64;
  const height = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const up = points[points.length - 1] >= points[0];
  const strokeColor = up ? colors.profit : colors.loss;

  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * (height - 2) - 1;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <path d={d} fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
