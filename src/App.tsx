import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@/hooks/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import LoginPage from '@/pages/LoginPage';
import DesktopApp from './DesktopApp';
import MobileApp from './MobileApp';
import { colors } from '@/theme';

function RootRedirect() {
  const [target, setTarget] = useState<'desktop' | 'mobile' | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setTarget(mq.matches ? 'mobile' : 'desktop');

    const handler = (e: MediaQueryListEvent) => {
      setTarget(e.matches ? 'mobile' : 'desktop');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (!target) return null;
  return <Navigate to={`/${target}`} replace />;
}

/** 认证守卫：未登录用户重定向到 /login */
function AuthGuard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{
              borderColor: colors.border,
              borderTopColor: colors.primary,
            }}
          />
          <span className="text-sm" style={{ color: colors.textTertiary }}>加载中...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/desktop" element={<DesktopApp />} />
      <Route path="/mobile" element={<MobileApp />} />
      <Route path="/mobile/:code" element={<MobileApp />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<AuthGuard />} />
      </Routes>
    </AppProvider>
  );
}
