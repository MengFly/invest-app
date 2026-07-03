// 全局应用状态 - 当前选中基金 & 跨组件刷新触发器
import {
  createContext,
  createElement,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

interface AppState {
  selectedFundCode: string | null;
  setSelectedFundCode: (code: string | null) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedFundCode, setSelectedFundCode] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      selectedFundCode,
      setSelectedFundCode,
      refreshTrigger,
      triggerRefresh,
    }),
    [selectedFundCode, refreshTrigger, triggerRefresh],
  );

  return createElement(AppContext.Provider, { value }, children);
}

export function useAppStore(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppStore must be used within an <AppProvider>');
  }
  return ctx;
}
