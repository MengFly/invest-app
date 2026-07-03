import { useState } from 'react';
import { AppProvider, useAppStore } from '@/hooks/useAppStore';
import { useHoldings } from '@/hooks/usePortfolio';
import { useAllSummaries } from '@/hooks/useAllSummaries';
import { HeaderStats } from '@/components/HeaderStats';
import { LeftPanel } from '@/components/LeftPanel';
import { RightPanel } from '@/components/RightPanel';
import { AddFundDialog } from '@/components/AddFundDialog';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { colors } from '@/theme';

function AppContent() {
  const { selectedFundCode, setSelectedFundCode, triggerRefresh, refreshTrigger } = useAppStore();
  const { holdings } = useHoldings(refreshTrigger);
  const { summaries } = useAllSummaries(refreshTrigger);

  const [addFundOpen, setAddFundOpen] = useState(false);
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
        <HeaderStats summaries={summaries} />
      </header>

      <div className="flex flex-1 overflow-hidden px-6 pb-4 gap-4">
        <div className="w-80 shrink-0 rounded-xl overflow-hidden border shadow-sm" style={{ borderColor: colors.borderLight, backgroundColor: colors.bgCard }}>
          <LeftPanel
            holdings={holdings}
            summaries={summaries}
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

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
