import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { useHoldings } from '@/hooks/usePortfolio';
import { useAllSummaries } from '@/hooks/useAllSummaries';
import { useAllEstimatedNavs } from '@/hooks/useEstimatedNav';
import { calcTotalEstimatedProfit } from '@/utils/estimatedProfit';
import { useAuth } from '@/hooks/useAuth';
import { setStorageMode, syncLocalToCloud, clearOldConfig } from '@/services/supabase';
import { HeaderStats } from '@/components/HeaderStats';
import { LeftPanel } from '@/components/LeftPanel';
import { RightPanel } from '@/components/RightPanel';
import { AddFundDialog } from '@/components/AddFundDialog';
import { AuthDialog } from '@/components/AuthDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
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

  const { user, loading: authLoading, signOut } = useAuth();

  // 页面刷新后自动恢复云端存储模式（如果用户已登录）
  useEffect(() => {
    if (!authLoading && user) {
      setStorageMode('cloud');
    }
  }, [user, authLoading]);

  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [addFundOpen, setAddFundOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState<string | null>(null);

  const handleRefresh = () => {
    triggerRefresh();
  };

  const handleDelete = (code: string) => {
    setDeleteCode(code);
  };

  const handleLoginSuccess = useCallback(async () => {
    // 登录后自动同步本地数据到云端
    setStorageMode('cloud');
    try {
      await syncLocalToCloud();
      clearOldConfig();
    } catch {
      // 同步失败不影响使用，数据还在本地
    }
    handleRefresh();
  }, []);

  const handleLogout = useCallback(() => {
    setLogoutConfirmOpen(true);
  }, []);

  const handleLogoutConfirm = useCallback(async () => {
    await signOut();
    setStorageMode('local');
    setLogoutConfirmOpen(false);
    handleRefresh();
  }, [signOut]);

  const deleteFund = deleteCode ? holdings.find((h) => h.code === deleteCode) : null;

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: colors.bg }}>
      <header className="shrink-0">
        <HeaderStats
          summaries={summaries}
          estimatedProfit={totalEstimatedProfit}
          user={user}
          authLoading={authLoading}
          onLogin={() => setAuthDialogOpen(true)}
          onLogout={handleLogout}
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

      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        onLoginSuccess={handleLoginSuccess}
      />

      <ConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        title="退出登录"
        message="确定要退出登录吗？退出后将切回本地存储模式。"
        confirmText="确认退出"
        onConfirm={handleLogoutConfirm}
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