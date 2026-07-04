import { useRef } from 'react';
import { colors } from '@/theme';
import { formatPercent } from '@/utils/format';
import { exportData, downloadJson, parseImportFile, importData } from '@/services/dataMigration';
import { useAppStore } from '@/hooks/useAppStore';
import { Download, Upload, Cloud } from 'lucide-react';
import type { HoldingSummary } from '@/types';

interface HeaderStatsProps {
  summaries: Record<string, HoldingSummary>;
  onOpenSupabaseConfig?: () => void;
}

export function HeaderStats({ summaries, onOpenSupabaseConfig }: HeaderStatsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { triggerRefresh } = useAppStore();

  const summaryList = Object.values(summaries);
  const totalAssets = summaryList.reduce((s, x) => s + x.holdAmount, 0);
  const totalProfit = summaryList.reduce((s, x) => s + x.totalProfit, 0);
  const totalInvested = summaryList.reduce((s, x) => s + x.totalInvested, 0);
  const totalProfitRate = totalInvested > 0 ? totalProfit / totalInvested : 0;

  const totalHoldingProfit = summaryList.reduce((s, x) => s + x.holdingProfit, 0);
  const totalHoldingCost = summaryList.reduce((s, x) => {
    const cost = x.holdAmount - x.holdingProfit;
    return s + (cost > 0 ? cost : 0);
  }, 0);
  const totalHoldingProfitRate = totalHoldingCost > 0 ? totalHoldingProfit / totalHoldingCost : 0;

  const avgHoldDays = summaryList.length > 0
    ? summaryList.reduce((s, x) => s + x.holdDays, 0) / summaryList.length
    : 0;
  const annualized = avgHoldDays > 0 ? (1 + totalProfitRate) ** (365 / avgHoldDays) - 1 : 0;

  const profitColor = totalProfit >= 0 ? colors.profit : colors.loss;

  const handleExport = () => {
    const data = exportData();
    downloadJson(data);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseImportFile(file);
      const result = await importData(data);
      if (result.success) {
        alert('数据导入成功');
        triggerRefresh();
      } else {
        alert(`导入完成，但有 ${result.errors.length} 个错误:\n${result.errors.join('\n')}`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '导入失败');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="px-6 pt-4 pb-3">
      <div
        className="rounded-xl px-5 pt-4 pb-4 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, #FAFAFA 0%, #FDF0F0 100%)',
          border: `1px solid ${colors.borderLight}`,
        }}
      >
        <div className="flex items-center gap-14">
          <MetricBlock
            label="总资产"
            value={`¥${totalAssets.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          />

          <MetricBlock
            label="累计收益"
            value={
              totalProfit >= 0
                ? `+¥${totalProfit.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `-¥${Math.abs(totalProfit).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
            valueColor={profitColor}
            badge={formatPercent(totalProfitRate)}
          />

          <MetricBlock
            label="持仓收益"
            value={
              totalHoldingProfit >= 0
                ? `+¥${totalHoldingProfit.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `-¥${Math.abs(totalHoldingProfit).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
            valueColor={totalHoldingProfit >= 0 ? colors.profit : colors.loss}
            badge={formatPercent(totalHoldingProfitRate)}
          />

          <MetricBlock
            label="年化收益率"
            value={formatPercent(annualized)}
            valueColor={annualized >= 0 ? colors.profit : colors.loss}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-all duration-150 hover:opacity-70 active:scale-[0.97]"
            style={{ backgroundColor: colors.bgInput, color: colors.textSecondary }}
            onClick={handleExport}
          >
            <Download size={13} strokeWidth={1.5} />
            导出
          </button>
          {onOpenSupabaseConfig && (
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-all duration-150 hover:opacity-70 active:scale-[0.97]"
              style={{ backgroundColor: colors.bgInput, color: colors.textSecondary }}
              onClick={onOpenSupabaseConfig}
            >
              <Cloud size={13} strokeWidth={1.5} />
              同步
            </button>
          )}
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-all duration-150 hover:opacity-70 active:scale-[0.97]"
            style={{ backgroundColor: colors.bgInput, color: colors.textSecondary }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={13} strokeWidth={1.5} />
            导入
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricBlock({
  label,
  value,
  valueColor,
  badge,
}: {
  label: string;
  value: string;
  valueColor?: string;
  badge?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[11px] font-medium tracking-wide" style={{ color: colors.textSecondary }}>
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className="text-[22px] font-bold leading-none tracking-tight"
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
}
