import { useState, useMemo } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { useHoldings } from '@/hooks/usePortfolio';
import { useAllSummaries } from '@/hooks/useAllSummaries';
import { useAllEstimatedNavs } from '@/hooks/useEstimatedNav';
import { calcTotalEstimatedProfit } from '@/utils/estimatedProfit';
import { HeaderStats } from '@/components/HeaderStats';
import { LeftPanel } from '@/components/LeftPanel';
import { RightPanel } from '@/components/RightPanel';
import { AddFundDialog } from '@/components/AddFundDialog';
import { SupabaseConfigDialog } from '@/components/SupabaseConfigDialog';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { colors } from '@/theme';

export default function DesktopApp() {
  const { selectedFundCode, setSelectedFundCode, triggerRefresh, refreshTrigger } = useAppStore();
  const { holdings } = useHoldings(refreshTrigger);
  const { summaries } = useAllSummaries(refreshTrigger);

  const codes = useMemo(() => holdings.map((h) => h.code), [holdings]);
  const estimatedNavs = useAllEstimatedNavs(codes);

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

  const [addFundOpen, setAddFundOpen] = useState(false);
  const [supabaseConfigOpen, setSupabaseConfigOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState<string | null>(null);

  const handleRefresh = () => {
    triggerRefresh();
  };

  const handleDelete = (code: string) => {
    setDeleteCode(code);
  };

  const deleteFund = deleteCode ? holdings.find((h) => h.code === deleteCode) : null;

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: colors.bg }}>
      <header className="shrink-0">
        <HeaderStats
          summaries={summaries}
          onOpenSupabaseConfig={() => setSupabaseConfigOpen(true)}
          estimatedProfit={totalEstimatedProfit}
        />
      </header>

      <div className="flex flex-1 overflow-hidden px-6 pb-4 gap-4">
        <div className="w-80 shrink-0 rounded-xl overflow-hidden border shadow-sm" style={{ borderColor: colors.borderLight, backgroundColor: colors.bgCard }}>
          <LeftPanel
            holdings={holdings}
            summaries={summaries}
            estimatedNavs={estimatedNavs}
            selectedCode={selectedFundCode}
            onSelect={setSelectedFundCode}
            onAddFund={() => setAddFundOpen(true)}
            onDelete={handleDelete}
          />
        </div>

        <div className="flex-1 rounded-xl overflow-hidden border shadow-sm" style={{ borderColor: colors.borderLight, backgroundColor: colors.bgCard }}>
          <RightPanel code={selectedFundCode} />
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